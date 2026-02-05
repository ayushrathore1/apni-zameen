"""
Pydantic schemas for Parcel API.
"""
from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field
from uuid import UUID


class ParcelBase(BaseModel):
    """Base parcel schema."""
    plot_id: str = Field(..., description="Unique plot identifier like '123/45'")
    village_code: str = Field(..., description="Village code like 'V001'")
    village_name: Optional[str] = None


class ParcelCreate(ParcelBase):
    """Schema for creating a parcel."""
    geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry object")


class ParcelResponse(ParcelBase):
    """Schema for parcel response."""
    id: UUID
    computed_area_sqm: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ParcelGeoJSON(BaseModel):
    """GeoJSON Feature representation of a parcel."""
    type: str = "Feature"
    id: str
    geometry: Optional[Dict[str, Any]] = None
    properties: Dict[str, Any]


class ParcelFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection of parcels."""
    type: str = "FeatureCollection"
    features: List[ParcelGeoJSON]


class BoundingBox(BaseModel):
    """Bounding box for spatial queries."""
    min_lon: float = Field(..., ge=-180, le=180)
    min_lat: float = Field(..., ge=-90, le=90)
    max_lon: float = Field(..., ge=-180, le=180)
    max_lat: float = Field(..., ge=-90, le=90)
