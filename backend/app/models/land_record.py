"""
LandRecord model - Textual ownership records.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Boolean, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class LandRecord(Base):
    """
    Represents textual ownership data for a land parcel.
    
    Supports versioning - each update creates a new record version
    rather than overwriting existing data.
    """
    __tablename__ = "land_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Link to parcel (plot_id is the business key)
    plot_id = Column(String(50), nullable=False, index=True)
    parcel_id = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=True)
    
    # Owner information
    owner_name_hindi = Column(String(200), nullable=False)
    owner_name_english = Column(String(200), nullable=True)
    father_name_hindi = Column(String(200), nullable=True)
    father_name_english = Column(String(200), nullable=True)
    
    # Area information
    recorded_area_sqm = Column(Float, nullable=True)
    recorded_area_text = Column(String(100), nullable=True)  # Original format like "2 बीघा 5 बिस्वा"
    
    # Record metadata
    record_type = Column(String(50), nullable=True)  # khata, b1, khatauni, etc.
    khata_number = Column(String(50), nullable=True)
    khatauni_number = Column(String(50), nullable=True)
    
    # Source information
    source_document = Column(String(200), nullable=True)
    source_page = Column(String(50), nullable=True)
    
    # Versioning
    version = Column(Integer, default=1, nullable=False)
    is_current = Column(Boolean, default=True, nullable=False)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("land_records.id"), nullable=True)
    
    # Remarks
    remarks = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parcel = relationship("Parcel", backref="land_records")
    
    def __repr__(self):
        return f"<LandRecord(plot_id={self.plot_id}, owner={self.owner_name_hindi}, v{self.version})>"
    
    def to_dict(self) -> dict:
        """Convert record to dictionary."""
        return {
            "id": str(self.id),
            "plot_id": self.plot_id,
            "owner_name_hindi": self.owner_name_hindi,
            "owner_name_english": self.owner_name_english,
            "father_name_hindi": self.father_name_hindi,
            "recorded_area_sqm": self.recorded_area_sqm,
            "recorded_area_text": self.recorded_area_text,
            "record_type": self.record_type,
            "khata_number": self.khata_number,
            "version": self.version,
            "is_current": self.is_current,
        }
