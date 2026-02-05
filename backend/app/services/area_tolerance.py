"""
Area tolerance service for comparing recorded vs computed areas.
"""
from typing import Tuple, Optional
from dataclasses import dataclass
from enum import Enum

from ..models.discrepancy import Severity
from ..config import settings


@dataclass
class AreaComparisonResult:
    """Result of area comparison."""
    matches: bool
    difference_sqm: float
    difference_percent: float
    severity: Optional[Severity]
    explanation: str
    explanation_hindi: str


def compare_areas(
    computed_sqm: float,
    recorded_sqm: float,
    tolerance_minor: float = None,
    tolerance_major: float = None
) -> AreaComparisonResult:
    """
    Compare computed area from geometry with recorded area from documents.
    
    Args:
        computed_sqm: Area computed from parcel geometry (sq meters)
        recorded_sqm: Area from land record documents (sq meters)
        tolerance_minor: Percentage threshold for minor discrepancy
        tolerance_major: Percentage threshold for major discrepancy
    
    Returns:
        AreaComparisonResult with match status, difference, and explanation
    """
    # Use settings defaults if not provided
    if tolerance_minor is None:
        tolerance_minor = settings.area_tolerance_minor
    if tolerance_major is None:
        tolerance_major = settings.area_tolerance_major
    
    # Handle edge cases
    if computed_sqm is None or recorded_sqm is None:
        return AreaComparisonResult(
            matches=False,
            difference_sqm=0,
            difference_percent=0,
            severity=Severity.MAJOR,
            explanation="Missing area data for comparison",
            explanation_hindi="क्षेत्रफल की तुलना के लिए डेटा उपलब्ध नहीं है"
        )
    
    if computed_sqm <= 0 or recorded_sqm <= 0:
        return AreaComparisonResult(
            matches=False,
            difference_sqm=abs(computed_sqm - recorded_sqm),
            difference_percent=100,
            severity=Severity.CRITICAL,
            explanation="Invalid area value (zero or negative)",
            explanation_hindi="अमान्य क्षेत्रफल मान (शून्य या ऋणात्मक)"
        )
    
    # Calculate difference
    difference_sqm = abs(computed_sqm - recorded_sqm)
    reference_area = recorded_sqm  # Use recorded as reference
    difference_percent = (difference_sqm / reference_area) * 100
    
    # Classify severity
    severity = classify_severity(difference_percent, tolerance_minor, tolerance_major)
    
    # Generate explanation
    explanation, explanation_hindi = generate_area_explanation(
        computed_sqm, recorded_sqm, difference_sqm, difference_percent, severity
    )
    
    return AreaComparisonResult(
        matches=severity is None,
        difference_sqm=round(difference_sqm, 2),
        difference_percent=round(difference_percent, 2),
        severity=severity,
        explanation=explanation,
        explanation_hindi=explanation_hindi
    )


def classify_severity(
    difference_percent: float,
    tolerance_minor: float = None,
    tolerance_major: float = None
) -> Optional[Severity]:
    """
    Classify area discrepancy severity based on percentage difference.
    
    Returns:
        Severity level or None if within tolerance
    """
    if tolerance_minor is None:
        tolerance_minor = settings.area_tolerance_minor
    if tolerance_major is None:
        tolerance_major = settings.area_tolerance_major
    
    if difference_percent <= tolerance_minor:
        return None  # Within acceptable tolerance
    elif difference_percent <= tolerance_major:
        return Severity.MINOR
    elif difference_percent <= 30:
        return Severity.MAJOR
    else:
        return Severity.CRITICAL


def generate_area_explanation(
    computed_sqm: float,
    recorded_sqm: float,
    difference_sqm: float,
    difference_percent: float,
    severity: Optional[Severity]
) -> Tuple[str, str]:
    """
    Generate human-readable explanation for area discrepancy.
    
    Returns:
        Tuple of (English explanation, Hindi explanation)
    """
    # Format areas for display
    computed_str = format_area(computed_sqm)
    recorded_str = format_area(recorded_sqm)
    diff_str = format_area(difference_sqm)
    
    if severity is None:
        eng = f"Area matches within tolerance. Computed: {computed_str}, Recorded: {recorded_str}"
        hin = f"क्षेत्रफल सहिष्णुता के भीतर है। गणना: {computed_str}, दर्ज: {recorded_str}"
    elif severity == Severity.MINOR:
        eng = f"Minor area difference of {diff_str} ({difference_percent:.1f}%). " \
              f"Computed: {computed_str}, Recorded: {recorded_str}. " \
              f"Likely measurement variation."
        hin = f"मामूली क्षेत्रफल अंतर {diff_str} ({difference_percent:.1f}%)। " \
              f"गणना: {computed_str}, दर्ज: {recorded_str}। " \
              f"संभावित माप भिन्नता।"
    elif severity == Severity.MAJOR:
        eng = f"Significant area mismatch of {diff_str} ({difference_percent:.1f}%). " \
              f"Computed: {computed_str}, Recorded: {recorded_str}. " \
              f"Requires verification."
        hin = f"महत्वपूर्ण क्षेत्रफल विसंगति {diff_str} ({difference_percent:.1f}%)। " \
              f"गणना: {computed_str}, दर्ज: {recorded_str}। " \
              f"सत्यापन आवश्यक।"
    else:  # CRITICAL
        eng = f"Critical area discrepancy of {diff_str} ({difference_percent:.1f}%). " \
              f"Computed: {computed_str}, Recorded: {recorded_str}. " \
              f"Immediate review required."
        hin = f"गंभीर क्षेत्रफल विसंगति {diff_str} ({difference_percent:.1f}%)। " \
              f"गणना: {computed_str}, दर्ज: {recorded_str}। " \
              f"तत्काल समीक्षा आवश्यक।"
    
    return eng, hin


def format_area(sqm: float) -> str:
    """Format area in square meters with appropriate unit."""
    if sqm >= 10000:
        return f"{sqm/10000:.2f} hectares"
    elif sqm >= 100:
        return f"{sqm:.0f} sq.m"
    else:
        return f"{sqm:.2f} sq.m"


def sqm_to_bigha(sqm: float, bigha_size: float = 2500) -> float:
    """
    Convert square meters to bigha (local unit).
    Note: Bigha size varies by region, default is 2500 sq.m (common in UP/Bihar)
    """
    return sqm / bigha_size


def bigha_to_sqm(bigha: float, bigha_size: float = 2500) -> float:
    """Convert bigha to square meters."""
    return bigha * bigha_size
