"""
Workflow Service

Manages status-based workflows for discrepancy resolution.
Enforces valid state transitions and permission checks.
"""
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from datetime import datetime
from enum import Enum

from sqlalchemy.orm import Session

from app.models import Discrepancy
from app.models.discrepancy import DiscrepancyStatus
from app.services.audit_service import (
    AuditService, EntityType, ActionType, log_discrepancy_status_change
)


class WorkflowError(Exception):
    """Raised when a workflow transition is invalid."""
    pass


# Valid status transitions
VALID_TRANSITIONS = {
    'open': ['under_review', 'resolved', 'ignored'],
    'under_review': ['open', 'resolved', 'disputed'],
    'resolved': ['open'],  # Can reopen if needed
    'disputed': ['under_review', 'resolved'],
    'ignored': ['open']  # Can reopen
}

# Roles required for transitions
TRANSITION_ROLES = {
    ('open', 'under_review'): ['operator', 'supervisor', 'admin'],
    ('open', 'resolved'): ['supervisor', 'admin'],
    ('open', 'ignored'): ['supervisor', 'admin'],
    ('under_review', 'open'): ['operator', 'supervisor', 'admin'],
    ('under_review', 'resolved'): ['supervisor', 'admin'],
    ('under_review', 'disputed'): ['operator', 'supervisor', 'admin'],
    ('resolved', 'open'): ['admin'],  # Only admin can reopen resolved
    ('disputed', 'under_review'): ['supervisor', 'admin'],
    ('disputed', 'resolved'): ['admin'],
    ('ignored', 'open'): ['supervisor', 'admin']
}


class WorkflowService:
    """
    Manages discrepancy resolution workflows.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)
    
    def can_transition(
        self,
        current_status: str,
        new_status: str,
        user_role: str = 'operator'
    ) -> Tuple[bool, str]:
        """
        Check if a status transition is allowed.
        
        Returns:
            (allowed: bool, reason: str)
        """
        # Check if transition is valid
        valid_next = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in valid_next:
            return False, f"Cannot transition from '{current_status}' to '{new_status}'"
        
        # Check role permission
        required_roles = TRANSITION_ROLES.get((current_status, new_status), ['admin'])
        if user_role not in required_roles:
            return False, f"Role '{user_role}' cannot make this transition"
        
        return True, "Transition allowed"
    
    def transition_status(
        self,
        discrepancy_id: UUID,
        new_status: str,
        user_name: str = 'system',
        user_role: str = 'operator',
        remarks: Optional[str] = None,
        evidence: Optional[Dict] = None
    ) -> Discrepancy:
        """
        Transition a discrepancy to a new status.
        
        Args:
            discrepancy_id: ID of discrepancy
            new_status: Target status
            user_name: User making the change
            user_role: User's role
            remarks: Explanation for the change
            evidence: Optional supporting evidence
            
        Returns:
            Updated Discrepancy
            
        Raises:
            WorkflowError: If transition is not allowed
        """
        # Get discrepancy
        disc = self.db.query(Discrepancy).filter(
            Discrepancy.id == discrepancy_id
        ).first()
        
        if not disc:
            raise WorkflowError(f"Discrepancy {discrepancy_id} not found")
        
        old_status = disc.status
        
        # Check transition validity
        allowed, reason = self.can_transition(old_status, new_status, user_role)
        if not allowed:
            raise WorkflowError(reason)
        
        # Update status
        disc.status = new_status
        disc.updated_at = datetime.utcnow()
        
        # Add resolution details if resolving
        if new_status == 'resolved':
            disc.resolved_at = datetime.utcnow()
            disc.resolved_by = user_name
            if remarks:
                disc.resolution_remarks = remarks
        
        # Log the change
        log_discrepancy_status_change(
            db=self.db,
            discrepancy_id=discrepancy_id,
            old_status=old_status,
            new_status=new_status,
            user_name=user_name,
            user_role=user_role,
            remarks=remarks
        )
        
        self.db.commit()
        
        return disc
    
    def get_available_transitions(
        self,
        current_status: str,
        user_role: str = 'operator'
    ) -> List[Dict[str, str]]:
        """
        Get list of available status transitions for current user.
        """
        valid_next = VALID_TRANSITIONS.get(current_status, [])
        available = []
        
        for next_status in valid_next:
            allowed, _ = self.can_transition(current_status, next_status, user_role)
            if allowed:
                available.append({
                    'status': next_status,
                    'label_en': self._get_status_label(next_status),
                    'label_hi': self._get_status_label_hindi(next_status)
                })
        
        return available
    
    def bulk_transition(
        self,
        discrepancy_ids: List[UUID],
        new_status: str,
        user_name: str = 'system',
        user_role: str = 'operator',
        remarks: Optional[str] = None
    ) -> Dict[str, int]:
        """
        Transition multiple discrepancies at once.
        
        Returns:
            Stats: {'success': n, 'failed': m, 'skipped': k}
        """
        stats = {'success': 0, 'failed': 0, 'skipped': 0}
        
        for disc_id in discrepancy_ids:
            try:
                disc = self.db.query(Discrepancy).filter(
                    Discrepancy.id == disc_id
                ).first()
                
                if not disc:
                    stats['skipped'] += 1
                    continue
                
                allowed, _ = self.can_transition(disc.status, new_status, user_role)
                if not allowed:
                    stats['skipped'] += 1
                    continue
                
                self.transition_status(
                    disc_id, new_status, user_name, user_role, remarks
                )
                stats['success'] += 1
                
            except WorkflowError:
                stats['failed'] += 1
            except Exception:
                stats['failed'] += 1
        
        return stats
    
    def _get_status_label(self, status: str) -> str:
        """Get English label for status."""
        labels = {
            'open': 'Open',
            'under_review': 'Under Review',
            'resolved': 'Resolved',
            'disputed': 'Disputed',
            'ignored': 'Ignored'
        }
        return labels.get(status, status)
    
    def _get_status_label_hindi(self, status: str) -> str:
        """Get Hindi label for status."""
        labels = {
            'open': 'खुला',
            'under_review': 'समीक्षाधीन',
            'resolved': 'हल किया गया',
            'disputed': 'विवादित',
            'ignored': 'अनदेखा'
        }
        return labels.get(status, status)


def get_workflow_stats(db: Session) -> Dict[str, int]:
    """
    Get counts of discrepancies by status.
    """
    from sqlalchemy import func
    
    results = db.query(
        Discrepancy.status,
        func.count(Discrepancy.id)
    ).group_by(Discrepancy.status).all()
    
    return {status: count for status, count in results}
