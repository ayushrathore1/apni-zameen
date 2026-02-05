"""
Parcel API routes.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_AsGeoJSON, ST_Envelope, ST_MakeEnvelope, ST_Intersects, ST_X, ST_Y

from ..database import get_db
from ..models.parcel import Parcel
from ..models.land_record import LandRecord
from ..schemas.parcel import (
    ParcelResponse, ParcelCreate, ParcelGeoJSON, 
    ParcelFeatureCollection, BoundingBox
)

router = APIRouter(prefix="/parcels", tags=["Parcels"])


@router.get("/", response_model=List[ParcelResponse])
def list_parcels(
    village_code: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all parcels with optional village filter."""
    query = db.query(Parcel)
    
    if village_code:
        query = query.filter(Parcel.village_code == village_code)
    
    parcels = query.offset(skip).limit(limit).all()
    return parcels


@router.get("/geojson", response_model=ParcelFeatureCollection)
def get_parcels_geojson(
    village_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all parcels as GeoJSON FeatureCollection with full properties."""
    import json
    import os
    
    # Try to load from the full generated GeoJSON which has all properties
    geojson_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "data", "generated", "bhinay_all_parcels.geojson"
    )
    
    if os.path.exists(geojson_path):
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        features = data.get('features', [])
        
        # Filter by village if specified
        if village_code:
            features = [f for f in features if f['properties'].get('village_code') == village_code]
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
    
    # Fallback to database query
    query = db.query(Parcel)
    
    if village_code:
        query = query.filter(Parcel.village_code == village_code)
    
    parcels = query.all()
    
    features = [
        ParcelGeoJSON(
            id=str(p.id),
            geometry=p.to_geojson_feature()["geometry"],
            properties={
                "plot_id": p.plot_id,
                "village_code": p.village_code,
                "village_name": p.village_name,
                "computed_area_sqm": p.computed_area_sqm
            }
        )
        for p in parcels
    ]
    
    return ParcelFeatureCollection(features=features)




@router.get("/bbox")
def get_parcels_in_bbox(
    min_lon: float = Query(..., ge=-180, le=180),
    min_lat: float = Query(..., ge=-90, le=90),
    max_lon: float = Query(..., ge=-180, le=180),
    max_lat: float = Query(..., ge=-90, le=90),
    db: Session = Depends(get_db)
):
    """Get parcels within a bounding box."""
    bbox = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    
    parcels = db.query(Parcel).filter(
        ST_Intersects(Parcel.geometry, bbox)
    ).all()
    
    features = [p.to_geojson_feature() for p in parcels]
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "bbox": [min_lon, min_lat, max_lon, max_lat]
    }


@router.get("/{parcel_id}", response_model=ParcelResponse)
def get_parcel(parcel_id: UUID, db: Session = Depends(get_db)):
    """Get a single parcel by ID."""
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel


@router.get("/{parcel_id}/geojson")
def get_parcel_geojson(parcel_id: UUID, db: Session = Depends(get_db)):
    """Get a parcel as GeoJSON Feature."""
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel.to_geojson_feature()


@router.get("/{parcel_id}/records")
def get_parcel_records(parcel_id: UUID, db: Session = Depends(get_db)):
    """Get land records linked to a parcel."""
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    
    records = db.query(LandRecord).filter(
        LandRecord.plot_id == parcel.plot_id,
        LandRecord.is_current == True
    ).all()
    
    return [r.to_dict() for r in records]


@router.get("/by-plot/{plot_id}")
def get_parcel_by_plot_id(plot_id: str, db: Session = Depends(get_db)):
    """Get a parcel by plot ID."""
    parcel = db.query(Parcel).filter(Parcel.plot_id == plot_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel.to_geojson_feature()
