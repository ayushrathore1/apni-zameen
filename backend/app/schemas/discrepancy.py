"""
Pydantic schemas for Discrepancy API.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
from ..models.discrepancy import DiscrepancyType, Severity, DiscrepancyStatus


class DiscrepancyBase(BaseModel):
    """Base discrepancy schema."""
    plot_id: str
    village_code: Optional[str] = None
    discrepancy_type: DiscrepancyType
    severity: Severity
    explanation: str
    explanation_hindi: Optional[str] = None


class DiscrepancyResponse(DiscrepancyBase):
    """Schema for discrepancy response."""
    id: UUID
    parcel_id: Optional[UUID] = None
    record_id: Optional[UUID] = None
    status: DiscrepancyStatus
    details: Optional[str] = None
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_remarks: Optional[str] = None
    
    class Config:
        from_attributes = True


class DiscrepancyUpdate(BaseModel):
    """Schema for updating discrepancy status."""
    status: DiscrepancyStatus
    resolution_remarks: Optional[str] = Field(None, description="Reason for status change")


class DiscrepancyFilter(BaseModel):
    """Filters for discrepancy queries."""
    village_code: Optional[str] = None
    discrepancy_type: Optional[DiscrepancyType] = None
    severity: Optional[Severity] = None
    status: Optional[DiscrepancyStatus] = None


class DiscrepancyStats(BaseModel):
    """Statistics summary for discrepancies."""
    total: int
    by_severity: dict
    by_status: dict
    by_type: dict


class DiscrepancyListResponse(BaseModel):
    """Paginated discrepancy list."""
    items: List[DiscrepancyResponse]
    total: int
    page: int
    page_size: int
