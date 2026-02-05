"""
Enhanced Discrepancy Scoring System

Provides intelligent severity scoring based on:
- Area mismatch magnitude
- Name similarity confidence
- Record completeness
- Historical patterns
- Village-level statistics
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from app.config import settings


class DiscrepancySeverity(str, Enum):
    """Discrepancy severity levels with numeric values."""
    CRITICAL = "critical"  # 80-100 points
    MAJOR = "major"        # 50-79 points
    MINOR = "minor"        # 0-49 points


@dataclass
class SeverityScore:
    """Detailed severity scoring result."""
    total_score: int  # 0-100
    severity: DiscrepancySeverity
    factors: Dict[str, int]  # factor_name -> points
    explanation_hindi: str
    explanation_english: str
    priority_rank: int  # 1 = highest priority


# Scoring weights for different factors
SCORING_WEIGHTS = {
    # Area discrepancy factors
    'area_critical_mismatch': 40,      # >25% difference
    'area_major_mismatch': 25,         # 10-25% difference  
    'area_minor_mismatch': 10,         # 5-10% difference
    
    # Name discrepancy factors
    'name_no_match': 30,               # <50% similarity
    'name_partial_match': 15,          # 50-80% similarity
    'name_likely_match': 5,            # 80-95% similarity
    
    # Record completeness factors
    'missing_parcel_geometry': 25,     # No map data
    'missing_ownership_record': 25,    # No ownership data
    'missing_father_name': 5,          # Incomplete record
    'missing_area_value': 10,          # Can't compare areas
    
    # Duplication factors
    'duplicate_plot_id': 35,           # Same plot ID
    'overlapping_geometry': 30,        # Spatial overlap
    
    # Historical factors
    'repeated_discrepancy': 15,        # Same issue multiple times
    'recently_resolved': -10,          # Was fixed before
}


def calculate_area_score(
    computed_sqm: Optional[float],
    recorded_sqm: Optional[float]
) -> Tuple[int, str, str]:
    """
    Calculate score component for area discrepancy.
    Returns (score, explanation_hindi, explanation_english)
    """
    if computed_sqm is None or recorded_sqm is None:
        return (
            SCORING_WEIGHTS['missing_area_value'],
            'क्षेत्रफल तुलना संभव नहीं',
            'Area comparison not possible'
        )
    
    if recorded_sqm == 0:
        return (
            SCORING_WEIGHTS['area_critical_mismatch'],
            'दर्ज क्षेत्रफल शून्य है',
            'Recorded area is zero'
        )
    
    diff_percent = abs(computed_sqm - recorded_sqm) / recorded_sqm * 100
    
    if diff_percent > 25:
        score = SCORING_WEIGHTS['area_critical_mismatch']
        return (
            score,
            f'क्षेत्रफल में {diff_percent:.1f}% का गंभीर अंतर',
            f'Critical area difference of {diff_percent:.1f}%'
        )
    elif diff_percent > 10:
        score = SCORING_WEIGHTS['area_major_mismatch']
        return (
            score,
            f'क्षेत्रफल में {diff_percent:.1f}% का महत्वपूर्ण अंतर',
            f'Major area difference of {diff_percent:.1f}%'
        )
    elif diff_percent > 5:
        score = SCORING_WEIGHTS['area_minor_mismatch']
        return (
            score,
            f'क्षेत्रफल में {diff_percent:.1f}% का मामूली अंतर',
            f'Minor area difference of {diff_percent:.1f}%'
        )
    else:
        return (0, 'क्षेत्रफल स्वीकार्य सीमा में', 'Area within acceptable range')


def calculate_name_score(similarity_percent: float) -> Tuple[int, str, str]:
    """
    Calculate score component for name matching.
    Returns (score, explanation_hindi, explanation_english)
    """
    if similarity_percent < 50:
        score = SCORING_WEIGHTS['name_no_match']
        return (
            score,
            f'नाम में केवल {similarity_percent:.0f}% समानता (मेल नहीं खाता)',
            f'Names only {similarity_percent:.0f}% similar (no match)'
        )
    elif similarity_percent < 80:
        score = SCORING_WEIGHTS['name_partial_match']
        return (
            score,
            f'नाम में {similarity_percent:.0f}% समानता (आंशिक मिलान)',
            f'Names {similarity_percent:.0f}% similar (partial match)'
        )
    elif similarity_percent < 95:
        score = SCORING_WEIGHTS['name_likely_match']
        return (
            score,
            f'नाम में {similarity_percent:.0f}% समानता (संभावित मिलान)',
            f'Names {similarity_percent:.0f}% similar (likely match)'
        )
    else:
        return (0, 'नाम पूर्णतः मेल खाता है', 'Names match')


def calculate_completeness_score(
    has_geometry: bool,
    has_record: bool,
    has_father_name: bool,
    has_area_values: bool
) -> Tuple[int, List[str], List[str]]:
    """
    Calculate score for record completeness.
    Returns (score, explanations_hindi, explanations_english)
    """
    score = 0
    explanations_hi = []
    explanations_en = []
    
    if not has_geometry:
        score += SCORING_WEIGHTS['missing_parcel_geometry']
        explanations_hi.append('भूखंड का नक्शा उपलब्ध नहीं')
        explanations_en.append('Parcel geometry not available')
    
    if not has_record:
        score += SCORING_WEIGHTS['missing_ownership_record']
        explanations_hi.append('स्वामित्व रिकॉर्ड उपलब्ध नहीं')
        explanations_en.append('Ownership record not available')
    
    if not has_father_name:
        score += SCORING_WEIGHTS['missing_father_name']
        explanations_hi.append('पिता का नाम गायब')
        explanations_en.append('Father name missing')
    
    if not has_area_values:
        score += SCORING_WEIGHTS['missing_area_value']
        explanations_hi.append('क्षेत्रफल मान गायब')
        explanations_en.append('Area values missing')
    
    return score, explanations_hi, explanations_en


def compute_severity_score(
    discrepancy_type: str,
    area_computed: Optional[float] = None,
    area_recorded: Optional[float] = None,
    name_similarity: Optional[float] = None,
    has_geometry: bool = True,
    has_record: bool = True,
    has_father_name: bool = True,
    previous_occurrences: int = 0,
    was_resolved_before: bool = False
) -> SeverityScore:
    """
    Compute comprehensive severity score for a discrepancy.
    """
    factors = {}
    explanations_hi = []
    explanations_en = []
    total_score = 0
    
    # 1. Type-specific scoring
    if discrepancy_type == 'area_mismatch':
        score, exp_hi, exp_en = calculate_area_score(area_computed, area_recorded)
        factors['area'] = score
        total_score += score
        explanations_hi.append(exp_hi)
        explanations_en.append(exp_en)
    
    elif discrepancy_type == 'name_mismatch':
        if name_similarity is not None:
            score, exp_hi, exp_en = calculate_name_score(name_similarity)
            factors['name'] = score
            total_score += score
            explanations_hi.append(exp_hi)
            explanations_en.append(exp_en)
    
    elif discrepancy_type == 'missing_record':
        factors['missing_record'] = SCORING_WEIGHTS['missing_ownership_record']
        total_score += SCORING_WEIGHTS['missing_ownership_record']
        explanations_hi.append('भूखंड के लिए स्वामित्व रिकॉर्ड नहीं मिला')
        explanations_en.append('No ownership record found for parcel')
    
    elif discrepancy_type == 'missing_parcel':
        factors['missing_parcel'] = SCORING_WEIGHTS['missing_parcel_geometry']
        total_score += SCORING_WEIGHTS['missing_parcel_geometry']
        explanations_hi.append('रिकॉर्ड के लिए भूखंड नक्शा नहीं मिला')
        explanations_en.append('No parcel geometry found for record')
    
    elif discrepancy_type == 'duplicate_record':
        factors['duplicate'] = SCORING_WEIGHTS['duplicate_plot_id']
        total_score += SCORING_WEIGHTS['duplicate_plot_id']
        explanations_hi.append('एक ही प्लॉट आईडी के लिए कई रिकॉर्ड')
        explanations_en.append('Multiple records for same plot ID')
    
    elif discrepancy_type == 'duplicate_parcel':
        factors['duplicate'] = SCORING_WEIGHTS['overlapping_geometry']
        total_score += SCORING_WEIGHTS['overlapping_geometry']
        explanations_hi.append('ओवरलैपिंग भूखंड सीमाएं पाई गईं')
        explanations_en.append('Overlapping parcel boundaries found')
    
    # 2. Completeness scoring
    comp_score, comp_hi, comp_en = calculate_completeness_score(
        has_geometry, has_record, has_father_name, 
        area_computed is not None and area_recorded is not None
    )
    if comp_score > 0:
        factors['completeness'] = comp_score
        total_score += comp_score
        explanations_hi.extend(comp_hi)
        explanations_en.extend(comp_en)
    
    # 3. Historical pattern adjustment
    if previous_occurrences > 0:
        repeat_score = min(SCORING_WEIGHTS['repeated_discrepancy'], 
                          previous_occurrences * 5)
        factors['repeated'] = repeat_score
        total_score += repeat_score
        explanations_hi.append(f'यह समस्या {previous_occurrences} बार पहले भी आई है')
        explanations_en.append(f'This issue has occurred {previous_occurrences} times before')
    
    if was_resolved_before:
        factors['previously_resolved'] = SCORING_WEIGHTS['recently_resolved']
        total_score += SCORING_WEIGHTS['recently_resolved']  # Negative value
        explanations_hi.append('पहले सुलझाया गया था')
        explanations_en.append('Was previously resolved')
    
    # 4. Cap score at 0-100
    total_score = max(0, min(100, total_score))
    
    # 5. Determine severity level
    if total_score >= 80:
        severity = DiscrepancySeverity.CRITICAL
    elif total_score >= 50:
        severity = DiscrepancySeverity.MAJOR
    else:
        severity = DiscrepancySeverity.MINOR
    
    # 6. Calculate priority rank (lower = higher priority)
    priority_rank = 100 - total_score
    
    return SeverityScore(
        total_score=total_score,
        severity=severity,
        factors=factors,
        explanation_hindi=' | '.join(explanations_hi),
        explanation_english=' | '.join(explanations_en),
        priority_rank=priority_rank
    )


def rank_discrepancies(
    discrepancies: List[Dict]
) -> List[Tuple[Dict, SeverityScore]]:
    """
    Rank a list of discrepancies by priority.
    Returns list of (discrepancy, score) tuples sorted by priority.
    """
    scored = []
    
    for disc in discrepancies:
        score = compute_severity_score(
            discrepancy_type=disc.get('discrepancy_type', 'unknown'),
            area_computed=disc.get('computed_area_sqm'),
            area_recorded=disc.get('recorded_area_sqm'),
            name_similarity=disc.get('name_similarity'),
            has_geometry=disc.get('has_geometry', True),
            has_record=disc.get('has_record', True),
            has_father_name=disc.get('has_father_name', True),
            previous_occurrences=disc.get('previous_occurrences', 0),
            was_resolved_before=disc.get('was_resolved_before', False)
        )
        scored.append((disc, score))
    
    # Sort by priority rank (ascending = highest priority first)
    scored.sort(key=lambda x: x[1].priority_rank)
    
    return scored
