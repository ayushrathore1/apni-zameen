"""
Discrepancy Detection Engine.
Core service for identifying inconsistencies between parcels and records.
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.parcel import Parcel
from ..models.land_record import LandRecord
from ..models.discrepancy import Discrepancy, DiscrepancyType, Severity, DiscrepancyStatus
from ..config import settings
from .name_similarity import calculate_name_similarity, explain_name_difference
from .area_tolerance import compare_areas


class DiscrepancyEngine:
    """
    Engine for detecting discrepancies between spatial and textual land data.
    
    Detects:
    - Area mismatches (computed vs recorded)
    - Name mismatches (spelling variations)
    - Missing records (parcel without record)
    - Missing parcels (record without parcel)
    - Duplicates (multiple records for same plot)
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.name_threshold = settings.name_similarity_threshold
    
    def run_detection(
        self, 
        village_code: Optional[str] = None,
        plot_ids: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Run full discrepancy detection.
        
        Args:
            village_code: Optional village filter
            plot_ids: Optional list of specific plots to check
        
        Returns:
            Summary of detection results
        """
        created = 0
        updated = 0
        total_checked = 0
        
        # Get parcels to check
        parcel_query = self.db.query(Parcel)
        if village_code:
            parcel_query = parcel_query.filter(Parcel.village_code == village_code)
        parcels = parcel_query.all()
        
        # Check each parcel
        for parcel in parcels:
            if plot_ids and parcel.plot_id not in plot_ids:
                continue
            
            total_checked += 1
            discrepancies = self._check_parcel(parcel)
            
            for disc in discrepancies:
                # Check if similar discrepancy exists
                existing = self._find_existing_discrepancy(
                    parcel.plot_id, 
                    disc["type"]
                )
                
                if existing:
                    # Update if status changed
                    if existing.status == DiscrepancyStatus.OPEN:
                        existing.explanation = disc["explanation"]
                        existing.explanation_hindi = disc["explanation_hindi"]
                        existing.severity = disc["severity"]
                        existing.details = json.dumps(disc["details"])
                        updated += 1
                else:
                    # Create new discrepancy
                    new_disc = Discrepancy(
                        parcel_id=parcel.id,
                        plot_id=parcel.plot_id,
                        village_code=parcel.village_code,
                        discrepancy_type=disc["type"],
                        severity=disc["severity"],
                        explanation=disc["explanation"],
                        explanation_hindi=disc["explanation_hindi"],
                        details=json.dumps(disc["details"]),
                        status=DiscrepancyStatus.OPEN
                    )
                    self.db.add(new_disc)
                    created += 1
        
        # Check for missing parcels (records without matching parcel)
        orphan_records = self._find_orphan_records(village_code)
        for record in orphan_records:
            existing = self._find_existing_discrepancy(
                record.plot_id,
                DiscrepancyType.MISSING_PARCEL
            )
            
            if not existing:
                new_disc = Discrepancy(
                    record_id=record.id,
                    plot_id=record.plot_id,
                    discrepancy_type=DiscrepancyType.MISSING_PARCEL,
                    severity=Severity.MAJOR,
                    explanation=f"No parcel geometry found for plot {record.plot_id}",
                    explanation_hindi=f"प्लॉट {record.plot_id} के लिए कोई भूखंड ज्यामिति नहीं मिली",
                    status=DiscrepancyStatus.OPEN
                )
                self.db.add(new_disc)
                created += 1
        
        self.db.commit()
        
        return {
            "created": created,
            "updated": updated,
            "total_checked": total_checked
        }
    
    def _check_parcel(self, parcel: Parcel) -> List[Dict[str, Any]]:
        """Check a single parcel for discrepancies."""
        discrepancies = []
        
        # Get current records for this parcel
        records = self.db.query(LandRecord).filter(
            LandRecord.plot_id == parcel.plot_id,
            LandRecord.is_current == True
        ).all()
        
        if not records:
            # Missing record discrepancy
            discrepancies.append({
                "type": DiscrepancyType.MISSING_RECORD,
                "severity": Severity.MAJOR,
                "explanation": f"No land record found for parcel {parcel.plot_id}",
                "explanation_hindi": f"भूखंड {parcel.plot_id} के लिए कोई भूमि रिकॉर्ड नहीं मिला",
                "details": {"parcel_id": str(parcel.id)}
            })
            return discrepancies
        
        # Check for duplicates
        if len(records) > 1:
            discrepancies.append({
                "type": DiscrepancyType.DUPLICATE_RECORD,
                "severity": Severity.MINOR,
                "explanation": f"Multiple current records ({len(records)}) found for plot {parcel.plot_id}",
                "explanation_hindi": f"प्लॉट {parcel.plot_id} के लिए कई रिकॉर्ड ({len(records)}) मिले",
                "details": {"record_count": len(records)}
            })
        
        # Check each record
        for record in records:
            # Area comparison
            if parcel.computed_area_sqm and record.recorded_area_sqm:
                area_result = compare_areas(
                    parcel.computed_area_sqm,
                    record.recorded_area_sqm
                )
                
                if not area_result.matches and area_result.severity:
                    discrepancies.append({
                        "type": DiscrepancyType.AREA_MISMATCH,
                        "severity": area_result.severity,
                        "explanation": area_result.explanation,
                        "explanation_hindi": area_result.explanation_hindi,
                        "details": {
                            "computed_sqm": parcel.computed_area_sqm,
                            "recorded_sqm": record.recorded_area_sqm,
                            "difference_sqm": area_result.difference_sqm,
                            "difference_percent": area_result.difference_percent
                        }
                    })
            
            # Name check (if we have English transliteration to compare)
            # This would compare against a reference if available
            # For now, just flag if name seems incomplete
            if record.owner_name_hindi and len(record.owner_name_hindi) < 3:
                discrepancies.append({
                    "type": DiscrepancyType.NAME_MISMATCH,
                    "severity": Severity.MINOR,
                    "explanation": "Owner name appears incomplete or abbreviated",
                    "explanation_hindi": "मालिक का नाम अधूरा या संक्षिप्त प्रतीत होता है",
                    "details": {"name": record.owner_name_hindi}
                })
        
        return discrepancies
    
    def _find_existing_discrepancy(
        self, 
        plot_id: str, 
        disc_type: DiscrepancyType
    ) -> Optional[Discrepancy]:
        """Find existing discrepancy of same type for plot."""
        return self.db.query(Discrepancy).filter(
            Discrepancy.plot_id == plot_id,
            Discrepancy.discrepancy_type == disc_type,
            Discrepancy.status.in_([DiscrepancyStatus.OPEN, DiscrepancyStatus.UNDER_REVIEW])
        ).first()
    
    def _find_orphan_records(self, village_code: Optional[str] = None) -> List[LandRecord]:
        """Find records that don't have matching parcels."""
        # Get all plot IDs that have parcels
        parcel_query = self.db.query(Parcel.plot_id)
        if village_code:
            parcel_query = parcel_query.filter(Parcel.village_code == village_code)
        parcel_plot_ids = {p[0] for p in parcel_query.all()}
        
        # Find records without matching parcel
        record_query = self.db.query(LandRecord).filter(
            LandRecord.is_current == True,
            ~LandRecord.plot_id.in_(parcel_plot_ids) if parcel_plot_ids else True
        )
        
        return record_query.all()
    
    def check_single_parcel(self, plot_id: str) -> Dict[str, Any]:
        """
        Check a single parcel for discrepancies.
        Returns detailed results without persisting.
        """
        parcel = self.db.query(Parcel).filter(Parcel.plot_id == plot_id).first()
        
        if not parcel:
            return {
                "plot_id": plot_id,
                "status": "error",
                "message": "Parcel not found"
            }
        
        discrepancies = self._check_parcel(parcel)
        
        return {
            "plot_id": plot_id,
            "parcel_id": str(parcel.id),
            "status": "checked",
            "discrepancies": discrepancies,
            "discrepancy_count": len(discrepancies)
        }
