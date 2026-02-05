"""
Discrepancy API routes.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.discrepancy import Discrepancy, DiscrepancyType, Severity, DiscrepancyStatus
from ..schemas.discrepancy import (
    DiscrepancyResponse, DiscrepancyUpdate, 
    DiscrepancyListResponse, DiscrepancyStats
)
from ..services.discrepancy_engine import DiscrepancyEngine

router = APIRouter(prefix="/discrepancies", tags=["Discrepancies"])


@router.get("/", response_model=DiscrepancyListResponse)
def list_discrepancies(
    village_code: Optional[str] = None,
    discrepancy_type: Optional[DiscrepancyType] = None,
    severity: Optional[Severity] = None,
    status: Optional[DiscrepancyStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """List discrepancies with filters and pagination."""
    query = db.query(Discrepancy)
    
    if village_code:
        query = query.filter(Discrepancy.village_code == village_code)
    if discrepancy_type:
        query = query.filter(Discrepancy.discrepancy_type == discrepancy_type)
    if severity:
        query = query.filter(Discrepancy.severity == severity)
    if status:
        query = query.filter(Discrepancy.status == status)
    
    total = query.count()
    
    items = query.order_by(
        Discrepancy.severity.desc(),
        Discrepancy.detected_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    return DiscrepancyListResponse(
        items=[DiscrepancyResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/stats", response_model=DiscrepancyStats)
def get_discrepancy_stats(
    village_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get statistical summary of discrepancies."""
    query = db.query(Discrepancy)
    
    if village_code:
        query = query.filter(Discrepancy.village_code == village_code)
    
    total = query.count()
    
    # By severity
    severity_counts = db.query(
        Discrepancy.severity, func.count(Discrepancy.id)
    ).group_by(Discrepancy.severity).all()
    by_severity = {s.value: c for s, c in severity_counts}
    
    # By status
    status_counts = db.query(
        Discrepancy.status, func.count(Discrepancy.id)
    ).group_by(Discrepancy.status).all()
    by_status = {s.value: c for s, c in status_counts}
    
    # By type
    type_counts = db.query(
        Discrepancy.discrepancy_type, func.count(Discrepancy.id)
    ).group_by(Discrepancy.discrepancy_type).all()
    by_type = {t.value: c for t, c in type_counts}
    
    return DiscrepancyStats(
        total=total,
        by_severity=by_severity,
        by_status=by_status,
        by_type=by_type
    )


@router.get("/{discrepancy_id}", response_model=DiscrepancyResponse)
def get_discrepancy(discrepancy_id: UUID, db: Session = Depends(get_db)):
    """Get a single discrepancy by ID."""
    discrepancy = db.query(Discrepancy).filter(Discrepancy.id == discrepancy_id).first()
    if not discrepancy:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    return discrepancy


@router.patch("/{discrepancy_id}/status", response_model=DiscrepancyResponse)
def update_discrepancy_status(
    discrepancy_id: UUID,
    update: DiscrepancyUpdate,
    db: Session = Depends(get_db)
):
    """Update discrepancy status."""
    discrepancy = db.query(Discrepancy).filter(Discrepancy.id == discrepancy_id).first()
    if not discrepancy:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    
    discrepancy.status = update.status
    if update.resolution_remarks:
        discrepancy.resolution_remarks = update.resolution_remarks
    
    if update.status == DiscrepancyStatus.RESOLVED:
        discrepancy.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(discrepancy)
    
    return discrepancy


@router.post("/detect")
def run_detection(
    village_code: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Trigger discrepancy detection for all parcels or a specific village."""
    engine = DiscrepancyEngine(db)
    
    # Run detection
    results = engine.run_detection(village_code=village_code)
    
    return {
        "status": "completed",
        "village_code": village_code or "all",
        "new_discrepancies": results["created"],
        "updated_discrepancies": results["updated"],
        "total_checked": results["total_checked"]
    }


@router.get("/by-plot/{plot_id}")
def get_discrepancies_by_plot(plot_id: str, db: Session = Depends(get_db)):
    """Get all discrepancies for a plot."""
    discrepancies = db.query(Discrepancy).filter(
        Discrepancy.plot_id == plot_id
    ).order_by(Discrepancy.detected_at.desc()).all()
    
    return [d.to_dict() for d in discrepancies]
