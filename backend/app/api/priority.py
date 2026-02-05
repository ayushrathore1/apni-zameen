"""
Priority Queue API for Dashboard

Provides endpoints for intelligent discrepancy prioritization.
"""
from typing import Optional, List
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.services.enhanced_discrepancy_engine import EnhancedDiscrepancyEngine


router = APIRouter(prefix="/priority", tags=["Priority Queue"])


class PriorityItem(BaseModel):
    """Prioritized discrepancy item."""
    id: str
    plot_id: str
    type: str
    severity: str
    status: str
    score: int
    explanation: str
    explanation_hindi: Optional[str]
    details: Optional[dict]
    created_at: Optional[str]


class PriorityQueueResponse(BaseModel):
    """Priority queue response."""
    items: List[PriorityItem]
    total: int
    highest_score: int
    village_code: Optional[str]


class DetectionStatsResponse(BaseModel):
    """Detection run statistics."""
    parcels_checked: int
    records_checked: int
    new_discrepancies: int
    updated_discrepancies: int
    resolved_discrepancies: int
    by_type: dict
    by_severity: dict


@router.get("/queue", response_model=PriorityQueueResponse)
def get_priority_queue(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    limit: int = Query(50, ge=1, le=200, description="Max items"),
    db: Session = Depends(get_db)
):
    """
    Get discrepancies sorted by priority score.
    
    Higher scores indicate more critical issues that need immediate attention.
    The scoring considers:
    - Discrepancy type severity
    - Area mismatch magnitude
    - Name similarity confidence
    - Record completeness
    - Historical patterns
    """
    engine = EnhancedDiscrepancyEngine(db)
    items = engine.get_priority_queue(village_code, limit)
    
    highest_score = max((item['score'] for item in items), default=0)
    
    return PriorityQueueResponse(
        items=items,
        total=len(items),
        highest_score=highest_score,
        village_code=village_code
    )


@router.post("/detect", response_model=DetectionStatsResponse)
def run_enhanced_detection(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    recheck: bool = Query(False, description="Re-evaluate existing discrepancies"),
    db: Session = Depends(get_db)
):
    """
    Run enhanced discrepancy detection with intelligent scoring.
    
    This uses advanced algorithms for:
    - Area tolerance analysis
    - Hindi-English name correlation
    - Multi-factor severity scoring
    - Duplicate detection
    """
    engine = EnhancedDiscrepancyEngine(db)
    stats = engine.run_detection(village_code, recheck)
    
    return DetectionStatsResponse(**stats)


@router.get("/score/{discrepancy_id}")
def get_discrepancy_score(
    discrepancy_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed scoring breakdown for a specific discrepancy.
    """
    from app.models import Discrepancy
    from uuid import UUID
    
    try:
        disc_uuid = UUID(discrepancy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid discrepancy ID")
    
    disc = db.query(Discrepancy).filter(Discrepancy.id == disc_uuid).first()
    
    if not disc:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    
    return {
        'id': str(disc.id),
        'plot_id': disc.plot_id,
        'type': disc.discrepancy_type.value if hasattr(disc.discrepancy_type, 'value') else disc.discrepancy_type,
        'severity': disc.severity.value if hasattr(disc.severity, 'value') else disc.severity,
        'score': _get_score_from_details(disc.details),
        'scoring_factors': _parse_details(disc.details),
        'explanation': disc.explanation,
        'explanation_hindi': disc.explanation_hindi
    }


def _parse_details(details):
    """Parse details field which may be JSON string."""
    if not details:
        return {}
    if isinstance(details, str):
        try:
            return json.loads(details)
        except:
            return {}
    return details


def _get_score_from_details(details):
    """Extract score from details."""
    return _parse_details(details).get('score', 0)


@router.get("/summary")
def get_priority_summary(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    db: Session = Depends(get_db)
):
    """
    Get summary statistics for prioritization dashboard.
    """
    from sqlalchemy import func
    from app.models import Discrepancy
    
    query = db.query(Discrepancy).filter(
        Discrepancy.status.in_(['open', 'under_review'])
    )
    
    if village_code:
        query = query.filter(Discrepancy.plot_id.like(f'{village_code}%'))
    
    discrepancies = query.all()
    
    # Calculate score distribution
    scores = []
    for d in discrepancies:
        score = _get_score_from_details(d.details)
        scores.append(score)
    
    if not scores:
        return {
            'total_open': 0,
            'critical_count': 0,
            'major_count': 0,
            'minor_count': 0,
            'average_score': 0,
            'score_distribution': {'0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0}
        }
    
    # Count by severity
    critical = sum(1 for d in discrepancies if (d.severity.value if hasattr(d.severity, 'value') else d.severity) == 'critical')
    major = sum(1 for d in discrepancies if (d.severity.value if hasattr(d.severity, 'value') else d.severity) == 'major')
    minor = sum(1 for d in discrepancies if (d.severity.value if hasattr(d.severity, 'value') else d.severity) == 'minor')
    
    # Score distribution
    dist = {'0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0}
    for s in scores:
        if s <= 25:
            dist['0-25'] += 1
        elif s <= 50:
            dist['26-50'] += 1
        elif s <= 75:
            dist['51-75'] += 1
        else:
            dist['76-100'] += 1
    
    return {
        'total_open': len(discrepancies),
        'critical_count': critical,
        'major_count': major,
        'minor_count': minor,
        'average_score': round(sum(scores) / len(scores), 1),
        'score_distribution': dist
    }
