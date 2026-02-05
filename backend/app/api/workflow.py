"""
Audit and Workflow API Endpoints

Provides endpoints for:
- Viewing change history
- Managing discrepancy workflows
- User activity tracking
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID

from app.database import get_db
from app.services.audit_service import AuditService, EntityType
from app.services.workflow_service import WorkflowService, WorkflowError, get_workflow_stats


router = APIRouter(prefix="/workflow", tags=["Workflow & Audit"])


# ==========================================
# Pydantic Models
# ==========================================

class StatusTransitionRequest(BaseModel):
    """Request to transition discrepancy status."""
    new_status: str
    remarks: Optional[str] = None
    user_name: str = "system"
    user_role: str = "operator"


class BulkTransitionRequest(BaseModel):
    """Request for bulk status transition."""
    discrepancy_ids: List[str]
    new_status: str
    remarks: Optional[str] = None
    user_name: str = "system"
    user_role: str = "operator"


class ChangeLogItem(BaseModel):
    """Change log entry in API response."""
    id: str
    entity_type: str
    entity_id: str
    action: str
    timestamp: Optional[str]
    user_name: str
    user_role: Optional[str]
    remarks: Optional[str]
    old_values: Optional[dict]
    new_values: Optional[dict]


class AvailableTransition(BaseModel):
    """Available status transition."""
    status: str
    label_en: str
    label_hi: str


# ==========================================
# Workflow Endpoints
# ==========================================

@router.post("/transition/{discrepancy_id}")
def transition_discrepancy_status(
    discrepancy_id: str,
    request: StatusTransitionRequest,
    db: Session = Depends(get_db)
):
    """
    Transition a discrepancy to a new status.
    
    Status transitions follow a defined workflow:
    - open → under_review, resolved, ignored
    - under_review → open, resolved, disputed
    - resolved → open (admin only)
    - disputed → under_review, resolved
    - ignored → open
    """
    try:
        disc_uuid = UUID(discrepancy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid discrepancy ID")
    
    workflow = WorkflowService(db)
    
    try:
        disc = workflow.transition_status(
            discrepancy_id=disc_uuid,
            new_status=request.new_status,
            user_name=request.user_name,
            user_role=request.user_role,
            remarks=request.remarks
        )
        
        return {
            'success': True,
            'discrepancy_id': str(disc.id),
            'old_status': disc.status,  # This will be new status after commit
            'new_status': request.new_status,
            'message': f'Status updated to {request.new_status}'
        }
        
    except WorkflowError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-transition")
def bulk_transition_status(
    request: BulkTransitionRequest,
    db: Session = Depends(get_db)
):
    """
    Transition multiple discrepancies at once.
    
    Returns counts of successful, failed, and skipped transitions.
    """
    workflow = WorkflowService(db)
    
    try:
        disc_uuids = [UUID(id_str) for id_str in request.discrepancy_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid discrepancy ID in list")
    
    stats = workflow.bulk_transition(
        discrepancy_ids=disc_uuids,
        new_status=request.new_status,
        user_name=request.user_name,
        user_role=request.user_role,
        remarks=request.remarks
    )
    
    return {
        'success': True,
        'stats': stats,
        'message': f"Processed {sum(stats.values())} discrepancies"
    }


@router.get("/available-transitions/{current_status}")
def get_available_transitions(
    current_status: str,
    user_role: str = Query("operator", description="User role"),
    db: Session = Depends(get_db)
) -> List[AvailableTransition]:
    """
    Get list of available status transitions for given status and role.
    """
    workflow = WorkflowService(db)
    transitions = workflow.get_available_transitions(current_status, user_role)
    return transitions


@router.get("/stats")
def get_workflow_statistics(
    db: Session = Depends(get_db)
):
    """
    Get counts of discrepancies by status.
    """
    stats = get_workflow_stats(db)
    return {
        'by_status': stats,
        'total': sum(stats.values())
    }


# ==========================================
# Audit History Endpoints
# ==========================================

@router.get("/history/{entity_type}/{entity_id}")
def get_entity_history(
    entity_type: str,
    entity_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
) -> List[ChangeLogItem]:
    """
    Get change history for a specific entity.
    
    Entity types: parcel, land_record, discrepancy
    """
    try:
        entity_uuid = UUID(entity_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid entity ID")
    
    try:
        etype = EntityType(entity_type)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid entity type. Must be one of: {[e.value for e in EntityType]}"
        )
    
    audit = AuditService(db)
    logs = audit.get_entity_history(etype, entity_uuid, limit)
    
    return [
        ChangeLogItem(
            id=str(log.id),
            entity_type=log.entity_type,
            entity_id=str(log.entity_id),
            action=log.action,
            timestamp=log.timestamp.isoformat() if log.timestamp else None,
            user_name=log.user_name,
            user_role=log.user_role,
            remarks=log.remarks,
            old_values=log.old_values,
            new_values=log.new_values
        )
        for log in logs
    ]


@router.get("/resolution-log/{discrepancy_id}")
def get_discrepancy_resolution_log(
    discrepancy_id: str,
    db: Session = Depends(get_db)
):
    """
    Get formatted resolution history for a discrepancy.
    
    Returns a user-friendly timeline of all status changes.
    """
    try:
        disc_uuid = UUID(discrepancy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid discrepancy ID")
    
    audit = AuditService(db)
    log = audit.get_discrepancy_resolution_log(disc_uuid)
    
    return {
        'discrepancy_id': discrepancy_id,
        'resolution_log': log,
        'total_entries': len(log)
    }


@router.get("/user-activity/{user_name}")
def get_user_activity(
    user_name: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
) -> List[ChangeLogItem]:
    """
    Get all changes made by a specific user.
    """
    audit = AuditService(db)
    logs = audit.get_user_activity(user_name, limit=limit)
    
    return [
        ChangeLogItem(
            id=str(log.id),
            entity_type=log.entity_type,
            entity_id=str(log.entity_id),
            action=log.action,
            timestamp=log.timestamp.isoformat() if log.timestamp else None,
            user_name=log.user_name,
            user_role=log.user_role,
            remarks=log.remarks,
            old_values=log.old_values,
            new_values=log.new_values
        )
        for log in logs
    ]


@router.get("/recent-changes")
def get_recent_changes(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
) -> List[ChangeLogItem]:
    """
    Get recent changes across all entities.
    """
    audit = AuditService(db)
    
    etype = None
    if entity_type:
        try:
            etype = EntityType(entity_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid entity type")
    
    logs = audit.get_recent_changes(entity_type=etype, limit=limit)
    
    return [
        ChangeLogItem(
            id=str(log.id),
            entity_type=log.entity_type,
            entity_id=str(log.entity_id),
            action=log.action,
            timestamp=log.timestamp.isoformat() if log.timestamp else None,
            user_name=log.user_name,
            user_role=log.user_role,
            remarks=log.remarks,
            old_values=log.old_values,
            new_values=log.new_values
        )
        for log in logs
    ]
