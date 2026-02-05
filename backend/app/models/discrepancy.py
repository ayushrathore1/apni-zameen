"""
Discrepancy model - Comparison results between spatial and textual data.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class DiscrepancyType(str, PyEnum):
    """Types of discrepancies that can be detected."""
    AREA_MISMATCH = "area_mismatch"
    NAME_MISMATCH = "name_mismatch"
    MISSING_RECORD = "missing_record"
    MISSING_PARCEL = "missing_parcel"
    DUPLICATE_RECORD = "duplicate_record"
    DUPLICATE_PARCEL = "duplicate_parcel"


class Severity(str, PyEnum):
    """Severity levels for discrepancies."""
    MINOR = "minor"      # Small variance, likely data entry
    MAJOR = "major"      # Significant difference, needs review
    CRITICAL = "critical"  # Major issue, requires immediate attention


class DiscrepancyStatus(str, PyEnum):
    """Status of discrepancy resolution."""
    OPEN = "open"                # Newly detected
    UNDER_REVIEW = "under_review"  # Being investigated
    RESOLVED = "resolved"        # Fixed
    DISPUTED = "disputed"        # Contested
    IGNORED = "ignored"          # Marked as false positive


class Discrepancy(Base):
    """
    Represents a detected discrepancy between parcel and record data.
    
    Each discrepancy includes:
    - Type of discrepancy
    - Severity classification
    - Human-readable explanation
    - Resolution status and workflow
    """
    __tablename__ = "discrepancies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Links to source data
    parcel_id = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=True)
    record_id = Column(UUID(as_uuid=True), ForeignKey("land_records.id"), nullable=True)
    plot_id = Column(String(50), nullable=False, index=True)
    village_code = Column(String(20), nullable=True, index=True)
    
    # Classification
    discrepancy_type = Column(
        Enum(DiscrepancyType, name="discrepancy_type_enum"),
        nullable=False,
        index=True
    )
    severity = Column(
        Enum(Severity, name="severity_enum"),
        nullable=False,
        index=True
    )
    
    # Explanation
    explanation = Column(Text, nullable=False)
    explanation_hindi = Column(Text, nullable=True)
    
    # Details (type-specific) - stored as JSON
    details = Column(Text, nullable=True)  # JSON string with comparison values
    
    # Resolution workflow
    status = Column(
        Enum(DiscrepancyStatus, name="discrepancy_status_enum"),
        default=DiscrepancyStatus.OPEN,
        nullable=False,
        index=True
    )
    resolution_remarks = Column(Text, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    parcel = relationship("Parcel", backref="discrepancies")
    record = relationship("LandRecord", backref="discrepancies")
    
    def __repr__(self):
        return f"<Discrepancy({self.discrepancy_type.value}, {self.severity.value}, plot={self.plot_id})>"
    
    def to_dict(self) -> dict:
        """Convert discrepancy to dictionary."""
        return {
            "id": str(self.id),
            "plot_id": self.plot_id,
            "village_code": self.village_code,
            "discrepancy_type": self.discrepancy_type.value,
            "severity": self.severity.value,
            "explanation": self.explanation,
            "explanation_hindi": self.explanation_hindi,
            "status": self.status.value,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }
