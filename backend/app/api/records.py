"""
Land Record API routes.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.land_record import LandRecord
from ..models.parcel import Parcel
from ..schemas.land_record import (
    LandRecordResponse, LandRecordCreate, 
    LandRecordUpdate, LandRecordWithParcel
)

router = APIRouter(prefix="/records", tags=["Land Records"])


@router.get("/", response_model=List[LandRecordResponse])
def list_records(
    village_code: Optional[str] = None,
    current_only: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List land records with optional filters."""
    query = db.query(LandRecord)
    
    if current_only:
        query = query.filter(LandRecord.is_current == True)
    
    if village_code:
        # Join with parcel to filter by village
        query = query.join(Parcel, LandRecord.parcel_id == Parcel.id).filter(
            Parcel.village_code == village_code
        )
    
    records = query.offset(skip).limit(limit).all()
    return records


@router.get("/{record_id}", response_model=LandRecordResponse)
def get_record(record_id: UUID, db: Session = Depends(get_db)):
    """Get a single land record by ID."""
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.get("/by-plot/{plot_id}")
def get_records_by_plot(
    plot_id: str, 
    include_history: bool = False,
    db: Session = Depends(get_db)
):
    """Get all records for a plot ID."""
    query = db.query(LandRecord).filter(LandRecord.plot_id == plot_id)
    
    if not include_history:
        query = query.filter(LandRecord.is_current == True)
    
    records = query.order_by(LandRecord.version.desc()).all()
    return [r.to_dict() for r in records]


@router.get("/{record_id}/history")
def get_record_history(record_id: UUID, db: Session = Depends(get_db)):
    """Get version history for a record."""
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Get all versions for this plot
    history = db.query(LandRecord).filter(
        LandRecord.plot_id == record.plot_id
    ).order_by(LandRecord.version.desc()).all()
    
    return [r.to_dict() for r in history]


@router.get("/{record_id}/with-parcel", response_model=LandRecordWithParcel)
def get_record_with_parcel(record_id: UUID, db: Session = Depends(get_db)):
    """Get a record with its linked parcel information."""
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    result = LandRecordWithParcel(
        **record.to_dict(),
        id=record.id,
        created_at=record.created_at,
        updated_at=record.updated_at
    )
    
    if record.parcel:
        result.village_code = record.parcel.village_code
        result.village_name = record.parcel.village_name
        result.computed_area_sqm = record.parcel.computed_area_sqm
    
    return result
