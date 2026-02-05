"""
Audit Trail Service

Provides immutable logging of all changes to records and discrepancies.
Supports compliance requirements and dispute resolution.
"""
from typing import Dict, Any, Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import ChangeLog
from app.config import settings


class EntityType(str, Enum):
    """Types of entities that can be logged."""
    PARCEL = "parcel"
    LAND_RECORD = "land_record"
    DISCREPANCY = "discrepancy"


class ActionType(str, Enum):
    """Types of actions that can be logged."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    STATUS_CHANGE = "status_change"
    LINK = "link"
    UNLINK = "unlink"
    RESOLVE = "resolve"
    REOPEN = "reopen"


class AuditService:
    """
    Service for creating and querying audit logs.
    All operations are append-only for immutability.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_change(
        self,
        entity_type: EntityType,
        entity_id: UUID,
        action: ActionType,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        user_name: str = "system",
        user_role: str = "system",
        remarks: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> ChangeLog:
        """
        Create an immutable audit log entry.
        
        Args:
            entity_type: Type of entity being changed
            entity_id: UUID of the entity
            action: Type of action performed
            old_values: Previous values (for updates)
            new_values: New values
            user_name: Name of user making change
            user_role: Role of user
            remarks: Optional explanation
            ip_address: Client IP for tracking
            
        Returns:
            Created ChangeLog entry
        """
        log_entry = ChangeLog(
            id=uuid4(),
            entity_type=entity_type.value,
            entity_id=entity_id,
            action=action.value,
            old_values=old_values,
            new_values=new_values,
            user_name=user_name,
            user_role=user_role,
            remarks=remarks,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(log_entry)
        # Note: Don't commit here - let caller manage transaction
        
        return log_entry
    
    def get_entity_history(
        self,
        entity_type: EntityType,
        entity_id: UUID,
        limit: int = 100
    ) -> List[ChangeLog]:
        """
        Get complete change history for an entity.
        """
        return self.db.query(ChangeLog).filter(
            ChangeLog.entity_type == entity_type.value,
            ChangeLog.entity_id == entity_id
        ).order_by(desc(ChangeLog.timestamp)).limit(limit).all()
    
    def get_user_activity(
        self,
        user_name: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[ChangeLog]:
        """
        Get all changes made by a specific user.
        """
        query = self.db.query(ChangeLog).filter(
            ChangeLog.user_name == user_name
        )
        
        if start_date:
            query = query.filter(ChangeLog.timestamp >= start_date)
        if end_date:
            query = query.filter(ChangeLog.timestamp <= end_date)
        
        return query.order_by(desc(ChangeLog.timestamp)).limit(limit).all()
    
    def get_recent_changes(
        self,
        entity_type: Optional[EntityType] = None,
        action: Optional[ActionType] = None,
        limit: int = 50
    ) -> List[ChangeLog]:
        """
        Get recent changes across all entities.
        """
        query = self.db.query(ChangeLog)
        
        if entity_type:
            query = query.filter(ChangeLog.entity_type == entity_type.value)
        if action:
            query = query.filter(ChangeLog.action == action.value)
        
        return query.order_by(desc(ChangeLog.timestamp)).limit(limit).all()
    
    def get_discrepancy_resolution_log(
        self,
        discrepancy_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Get formatted resolution history for a discrepancy.
        Useful for displaying in UI.
        """
        logs = self.get_entity_history(EntityType.DISCREPANCY, discrepancy_id)
        
        formatted = []
        for log in logs:
            entry = {
                'id': str(log.id),
                'action': log.action,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                'user': log.user_name,
                'role': log.user_role,
                'remarks': log.remarks
            }
            
            # Add status change details
            if log.action == 'status_change' and log.new_values:
                entry['old_status'] = log.old_values.get('status') if log.old_values else None
                entry['new_status'] = log.new_values.get('status')
            
            formatted.append(entry)
        
        return formatted


def log_discrepancy_status_change(
    db: Session,
    discrepancy_id: UUID,
    old_status: str,
    new_status: str,
    user_name: str = "system",
    user_role: str = "system",
    remarks: Optional[str] = None
) -> ChangeLog:
    """
    Convenience function for logging discrepancy status changes.
    """
    audit = AuditService(db)
    return audit.log_change(
        entity_type=EntityType.DISCREPANCY,
        entity_id=discrepancy_id,
        action=ActionType.STATUS_CHANGE,
        old_values={'status': old_status},
        new_values={'status': new_status},
        user_name=user_name,
        user_role=user_role,
        remarks=remarks
    )


def log_record_update(
    db: Session,
    record_id: UUID,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    user_name: str = "system",
    user_role: str = "system",
    remarks: Optional[str] = None
) -> ChangeLog:
    """
    Convenience function for logging land record updates.
    """
    audit = AuditService(db)
    return audit.log_change(
        entity_type=EntityType.LAND_RECORD,
        entity_id=record_id,
        action=ActionType.UPDATE,
        old_values=old_values,
        new_values=new_values,
        user_name=user_name,
        user_role=user_role,
        remarks=remarks
    )
