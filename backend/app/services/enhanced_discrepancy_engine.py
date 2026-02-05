"""
Enhanced Discrepancy Engine v2

Integrates advanced name matching and severity scoring
for intelligent reconciliation.
"""
from typing import Dict, List, Optional, Any
from uuid import uuid4
from datetime import datetime
import json

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models import Parcel, LandRecord, Discrepancy
from app.models.discrepancy import DiscrepancyType, Severity, DiscrepancyStatus
from app.services.advanced_name_matching import compare_names, NameMatch
from app.services.severity_scoring import compute_severity_score, SeverityScore
from app.config import settings


class EnhancedDiscrepancyEngine:
    """
    Advanced discrepancy detection with intelligent scoring.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.area_tolerance_minor = settings.area_tolerance_minor
        self.area_tolerance_major = settings.area_tolerance_major
        self.name_similarity_threshold = settings.name_similarity_threshold
    
    def run_detection(
        self, 
        village_code: Optional[str] = None,
        recheck_existing: bool = False
    ) -> Dict[str, Any]:
        """
        Run comprehensive discrepancy detection.
        
        Args:
            village_code: Optional filter for specific village
            recheck_existing: If True, re-evaluate existing discrepancies
            
        Returns:
            Statistics about detection results
        """
        stats = {
            'parcels_checked': 0,
            'records_checked': 0,
            'new_discrepancies': 0,
            'updated_discrepancies': 0,
            'resolved_discrepancies': 0,
            'by_type': {},
            'by_severity': {'critical': 0, 'major': 0, 'minor': 0}
        }
        
        # Get all parcels
        parcel_query = self.db.query(Parcel)
        if village_code:
            parcel_query = parcel_query.filter(Parcel.village_code == village_code)
        parcels = parcel_query.all()
        
        stats['parcels_checked'] = len(parcels)
        
        # Get all current records
        record_query = self.db.query(LandRecord).filter(LandRecord.is_current == True)
        if village_code:
            record_query = record_query.filter(LandRecord.plot_id.like(f'{village_code}%'))
        records = record_query.all()
        
        stats['records_checked'] = len(records)
        
        # Build lookup maps
        records_by_plot = {}
        for record in records:
            if record.plot_id not in records_by_plot:
                records_by_plot[record.plot_id] = []
            records_by_plot[record.plot_id].append(record)
        
        parcels_by_plot = {p.plot_id: p for p in parcels}
        
        # Check each parcel
        for parcel in parcels:
            discrepancies = self._check_parcel_enhanced(
                parcel, 
                records_by_plot.get(parcel.plot_id, [])
            )
            
            for disc_data in discrepancies:
                result = self._create_or_update_discrepancy(disc_data)
                if result == 'new':
                    stats['new_discrepancies'] += 1
                elif result == 'updated':
                    stats['updated_discrepancies'] += 1
                
                disc_type = disc_data['type']
                stats['by_type'][disc_type] = stats['by_type'].get(disc_type, 0) + 1
                stats['by_severity'][disc_data['severity']] += 1
        
        # Check for orphan records (records without parcels)
        for plot_id, rec_list in records_by_plot.items():
            if plot_id not in parcels_by_plot:
                for record in rec_list:
                    disc_data = self._create_missing_parcel_discrepancy(record)
                    result = self._create_or_update_discrepancy(disc_data)
                    if result == 'new':
                        stats['new_discrepancies'] += 1
                    stats['by_type']['missing_parcel'] = stats['by_type'].get('missing_parcel', 0) + 1
                    stats['by_severity'][disc_data['severity']] += 1
        
        # Check for duplicates
        duplicate_discrepancies = self._check_duplicates(records_by_plot)
        for disc_data in duplicate_discrepancies:
            result = self._create_or_update_discrepancy(disc_data)
            if result == 'new':
                stats['new_discrepancies'] += 1
            stats['by_type']['duplicate_record'] = stats['by_type'].get('duplicate_record', 0) + 1
            stats['by_severity'][disc_data['severity']] += 1
        
        self.db.commit()
        
        return stats
    
    def _check_parcel_enhanced(
        self, 
        parcel: Parcel, 
        records: List[LandRecord]
    ) -> List[Dict]:
        """
        Enhanced parcel check with advanced scoring.
        """
        discrepancies = []
        
        # 1. Check for missing record
        if not records:
            score = compute_severity_score(
                discrepancy_type='missing_record',
                has_record=False,
                has_geometry=True
            )
            
            discrepancies.append({
                'type': 'missing_record',
                'plot_id': parcel.plot_id,
                'parcel_id': parcel.id,
                'record_id': None,
                'severity': score.severity.value,
                'score': score.total_score,
                'explanation': score.explanation_english,
                'explanation_hindi': score.explanation_hindi,
                'details': {'village_code': parcel.village_code}
            })
            return discrepancies
        
        # 2. Check each record against parcel
        for record in records:
            # Area comparison
            if parcel.computed_area_sqm and record.recorded_area_sqm:
                area_discrepancy = self._check_area_enhanced(
                    parcel, record
                )
                if area_discrepancy:
                    discrepancies.append(area_discrepancy)
            
            # Name comparison (if we have previous record to compare)
            name_discrepancy = self._check_name_enhanced(parcel, record)
            if name_discrepancy:
                discrepancies.append(name_discrepancy)
        
        return discrepancies
    
    def _check_area_enhanced(
        self, 
        parcel: Parcel, 
        record: LandRecord
    ) -> Optional[Dict]:
        """
        Enhanced area check with intelligent scoring.
        """
        computed = parcel.computed_area_sqm
        recorded = record.recorded_area_sqm
        
        if not computed or not recorded:
            return None
        
        diff_percent = abs(computed - recorded) / recorded * 100
        
        # Only flag if above minor threshold
        if diff_percent <= self.area_tolerance_minor:
            return None
        
        score = compute_severity_score(
            discrepancy_type='area_mismatch',
            area_computed=computed,
            area_recorded=recorded,
            has_geometry=True,
            has_record=True
        )
        
        return {
            'type': 'area_mismatch',
            'plot_id': parcel.plot_id,
            'parcel_id': parcel.id,
            'record_id': record.id,
            'severity': score.severity.value,
            'score': score.total_score,
            'explanation': score.explanation_english,
            'explanation_hindi': score.explanation_hindi,
            'details': {
                'computed_sqm': computed,
                'recorded_sqm': recorded,
                'difference_percent': round(diff_percent, 2),
                'difference_sqm': round(abs(computed - recorded), 2)
            }
        }
    
    def _check_name_enhanced(
        self, 
        parcel: Parcel, 
        record: LandRecord
    ) -> Optional[Dict]:
        """
        Enhanced name check using advanced matching.
        
        This compares owner names within the same record for consistency
        and can be extended to compare against historical records.
        """
        # Compare Hindi and English names within same record
        if record.owner_name_hindi and record.owner_name_english:
            match = compare_names(
                record.owner_name_hindi, None,
                None, record.owner_name_english
            )
            
            # Flag if names don't correlate well
            if match.similarity_score < self.name_similarity_threshold:
                score = compute_severity_score(
                    discrepancy_type='name_mismatch',
                    name_similarity=match.similarity_score,
                    has_geometry=True,
                    has_record=True
                )
                
                return {
                    'type': 'name_mismatch',
                    'plot_id': parcel.plot_id,
                    'parcel_id': parcel.id,
                    'record_id': record.id,
                    'severity': score.severity.value,
                    'score': score.total_score,
                    'explanation': f"Hindi and English names differ: {match.explanation_english}",
                    'explanation_hindi': f"हिंदी और अंग्रेजी नाम में अंतर: {match.explanation_hindi}",
                    'details': {
                        'hindi_name': record.owner_name_hindi,
                        'english_name': record.owner_name_english,
                        'similarity_score': round(match.similarity_score, 2),
                        'match_type': match.match_type
                    }
                }
        
        return None
    
    def _create_missing_parcel_discrepancy(self, record: LandRecord) -> Dict:
        """Create discrepancy for record without parcel."""
        score = compute_severity_score(
            discrepancy_type='missing_parcel',
            has_geometry=False,
            has_record=True
        )
        
        return {
            'type': 'missing_parcel',
            'plot_id': record.plot_id,
            'parcel_id': None,
            'record_id': record.id,
            'severity': score.severity.value,
            'score': score.total_score,
            'explanation': score.explanation_english,
            'explanation_hindi': score.explanation_hindi,
            'details': {
                'owner_name': record.owner_name_hindi or record.owner_name_english
            }
        }
    
    def _check_duplicates(
        self, 
        records_by_plot: Dict[str, List[LandRecord]]
    ) -> List[Dict]:
        """Check for duplicate records."""
        discrepancies = []
        
        for plot_id, rec_list in records_by_plot.items():
            if len(rec_list) > 1:
                # Multiple current records for same plot
                score = compute_severity_score(
                    discrepancy_type='duplicate_record'
                )
                
                discrepancies.append({
                    'type': 'duplicate_record',
                    'plot_id': plot_id,
                    'parcel_id': None,
                    'record_id': rec_list[0].id,
                    'severity': score.severity.value,
                    'score': score.total_score,
                    'explanation': f'{len(rec_list)} current records found for same plot',
                    'explanation_hindi': f'एक ही प्लॉट के लिए {len(rec_list)} वर्तमान रिकॉर्ड मिले',
                    'details': {
                        'record_count': len(rec_list),
                        'record_ids': [str(r.id) for r in rec_list]
                    }
                })
        
        return discrepancies
    
    def _create_or_update_discrepancy(self, disc_data: Dict) -> str:
        """
        Create new discrepancy or update existing.
        Returns 'new', 'updated', or 'unchanged'.
        """
        # Check for existing discrepancy
        existing = self.db.query(Discrepancy).filter(
            and_(
                Discrepancy.plot_id == disc_data['plot_id'],
                Discrepancy.discrepancy_type == disc_data['type'],
                Discrepancy.status.in_(['open', 'under_review'])
            )
        ).first()
        
        if existing:
            # Update if score changed significantly
            details_dict = json.loads(existing.details) if existing.details else {}
            old_score = details_dict.get('score', 0)
            if abs(old_score - disc_data['score']) > 5:
                existing.severity = disc_data['severity']
                existing.explanation = disc_data['explanation']
                existing.explanation_hindi = disc_data['explanation_hindi']
                details_dict.update(disc_data['details'])
                details_dict['score'] = disc_data['score']
                existing.details = json.dumps(details_dict)
                existing.updated_at = datetime.utcnow()
                return 'updated'
            return 'unchanged'
        
        # Create new
        details_with_score = {**disc_data['details'], 'score': disc_data['score']}
        new_disc = Discrepancy(
            id=uuid4(),
            plot_id=disc_data['plot_id'],
            parcel_id=disc_data.get('parcel_id'),
            record_id=disc_data.get('record_id'),
            discrepancy_type=disc_data['type'],
            severity=disc_data['severity'],
            status='open',
            explanation=disc_data['explanation'],
            explanation_hindi=disc_data['explanation_hindi'],
            details=json.dumps(details_with_score)
        )
        self.db.add(new_disc)
        return 'new'
    
    def get_priority_queue(
        self, 
        village_code: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get discrepancies sorted by priority score.
        """
        query = self.db.query(Discrepancy).filter(
            Discrepancy.status.in_(['open', 'under_review'])
        )
        
        if village_code:
            query = query.filter(Discrepancy.plot_id.like(f'{village_code}%'))
        
        discrepancies = query.all()
        
        # Sort by score in details
        def get_score(d):
            if d.details:
                try:
                    details_dict = json.loads(d.details) if isinstance(d.details, str) else d.details
                    return details_dict.get('score', 50)
                except:
                    return 50
            return 50
        
        sorted_discs = sorted(discrepancies, key=get_score, reverse=True)
        
        return [
            {
                'id': str(d.id),
                'plot_id': d.plot_id,
                'type': d.discrepancy_type.value if hasattr(d.discrepancy_type, 'value') else d.discrepancy_type,
                'severity': d.severity.value if hasattr(d.severity, 'value') else d.severity,
                'status': d.status.value if hasattr(d.status, 'value') else d.status,
                'score': get_score(d),
                'explanation': d.explanation,
                'explanation_hindi': d.explanation_hindi,
                'details': json.loads(d.details) if isinstance(d.details, str) else d.details,
                'created_at': d.created_at.isoformat() if d.created_at else None
            }
            for d in sorted_discs[:limit]
        ]
