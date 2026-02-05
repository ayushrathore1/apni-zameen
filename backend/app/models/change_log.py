"""
ChangeLog model - Immutable audit trail for all changes.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class ActionType(str, PyEnum):
    """Types of actions that can be logged."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    STATUS_CHANGE = "status_change"
    RESOLVE = "resolve"
    IMPORT = "import"


class ChangeLog(Base):
    """
    Immutable audit log entry.
    
    Records all changes to parcels, records, and discrepancies
    for complete traceability.
    """
    __tablename__ = "change_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Target entity
    entity_type = Column(String(50), nullable=False, index=True)  # parcel, land_record, discrepancy
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Action details
    action = Column(
        Enum(ActionType, name="action_type_enum"),
        nullable=False,
        index=True
    )
    
    # Change data
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    
    # User and context
    user_name = Column(String(100), nullable=True)  # No auth for MVP
    user_ip = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    
    # Timestamp (immutable)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f"<ChangeLog({self.action.value} on {self.entity_type}:{self.entity_id})>"
    
    def to_dict(self) -> dict:
        """Convert log entry to dictionary."""
        return {
            "id": str(self.id),
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id),
            "action": self.action.value,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "user_name": self.user_name,
            "remarks": self.remarks,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
