"""
Pydantic schemas for LandRecord API.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class LandRecordBase(BaseModel):
    """Base land record schema."""
    plot_id: str = Field(..., description="Plot identifier matching parcel")
    owner_name_hindi: str = Field(..., description="Owner name in Hindi")
    owner_name_english: Optional[str] = Field(None, description="Owner name in English")
    father_name_hindi: Optional[str] = None
    father_name_english: Optional[str] = None
    recorded_area_sqm: Optional[float] = None
    recorded_area_text: Optional[str] = None
    record_type: Optional[str] = None
    khata_number: Optional[str] = None
    khatauni_number: Optional[str] = None


class LandRecordCreate(LandRecordBase):
    """Schema for creating a land record."""
    source_document: Optional[str] = None
    source_page: Optional[str] = None
    remarks: Optional[str] = None


class LandRecordUpdate(BaseModel):
    """Schema for updating a land record (creates new version)."""
    owner_name_hindi: Optional[str] = None
    owner_name_english: Optional[str] = None
    father_name_hindi: Optional[str] = None
    recorded_area_sqm: Optional[float] = None
    recorded_area_text: Optional[str] = None
    remarks: Optional[str] = Field(None, description="Reason for update")


class LandRecordResponse(LandRecordBase):
    """Schema for land record response."""
    id: UUID
    parcel_id: Optional[UUID] = None
    version: int
    is_current: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LandRecordWithParcel(LandRecordResponse):
    """Land record with parcel information."""
    village_code: Optional[str] = None
    village_name: Optional[str] = None
    computed_area_sqm: Optional[float] = None
