"""
Search API routes with Hindi/English support.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from ..database import get_db
from ..models.parcel import Parcel
from ..models.land_record import LandRecord
from ..schemas.search import SearchResult, SearchResultItem, AutocompleteResult
from ..services.name_similarity import normalize_search_query

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/", response_model=SearchResult)
def unified_search(
    q: str = Query(..., min_length=1, description="Search query"),
    village_code: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Unified search across plot IDs and owner names.
    Supports both Hindi and English queries.
    """
    query = normalize_search_query(q)
    results = []
    
    # Search by plot ID (exact and partial)
    parcel_query = db.query(Parcel).filter(
        Parcel.plot_id.ilike(f"%{query}%")
    )
    if village_code:
        parcel_query = parcel_query.filter(Parcel.village_code == village_code)
    
    parcels = parcel_query.limit(limit // 2).all()
    
    for p in parcels:
        # Get centroid coordinates
        centroid = p.geometry_shape.centroid if p.geometry_shape else None
        
        results.append(SearchResultItem(
            type="parcel",
            id=p.id,
            plot_id=p.plot_id,
            village_code=p.village_code,
            village_name=p.village_name,
            computed_area_sqm=p.computed_area_sqm,
            centroid_lon=centroid.x if centroid else None,
            centroid_lat=centroid.y if centroid else None,
            match_score=100.0 if p.plot_id == query else 80.0,
            match_field="plot_id"
        ))
    
    # Search by owner name (Hindi and English with fuzzy matching); join Parcel for centroid/village
    record_query = db.query(LandRecord, Parcel).join(
        Parcel, LandRecord.plot_id == Parcel.plot_id
    ).filter(
        LandRecord.is_current == True,
        or_(
            LandRecord.owner_name_hindi.ilike(f"%{query}%"),
            LandRecord.owner_name_english.ilike(f"%{query}%")
        )
    )

    if village_code:
        record_query = record_query.filter(Parcel.village_code == village_code)

    records_with_parcel = record_query.limit(limit // 2).all()

    for r, parcel in records_with_parcel:
        centroid = parcel.geometry_shape.centroid if parcel.geometry_shape else None
        results.append(SearchResultItem(
            type="record",
            id=r.id,
            plot_id=r.plot_id,
            village_code=parcel.village_code,
            village_name=parcel.village_name,
            owner_name_hindi=r.owner_name_hindi,
            owner_name_english=r.owner_name_english,
            centroid_lon=centroid.x if centroid else None,
            centroid_lat=centroid.y if centroid else None,
            match_score=90.0,
            match_field="owner_name"
        ))
    
    return SearchResult(
        query=q,
        total=len(results),
        results=results[:limit]
    )


def _find_plot_in_geojson_dir(plot_id: str, data_dir: str):
    """Look for plot_id in bhinay_all_parcels.geojson then in *_parcels.geojson files. Returns feature or None."""
    import glob
    import json
    import os

    # 1. Try combined file first
    combined = os.path.join(data_dir, "bhinay_all_parcels.geojson")
    if os.path.exists(combined):
        with open(combined, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for feature in data.get('features', []):
            if feature.get('properties', {}).get('plot_id') == plot_id and feature.get('geometry'):
                return feature

    # 2. Try village-specific *_parcels.geojson files
    for path in sorted(glob.glob(os.path.join(data_dir, "*_parcels.geojson"))):
        if path == combined:
            continue
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            for feature in data.get('features', []):
                if feature.get('properties', {}).get('plot_id') == plot_id and feature.get('geometry'):
                    return feature
        except (OSError, json.JSONDecodeError):
            continue
    return None


@router.get("/plot")
def search_by_plot(
    plot_id: str = Query(..., description="Exact plot ID to search"),
    db: Session = Depends(get_db)
):
    """Search for a specific plot ID and return full GeoJSON with all properties."""
    import json
    import os

    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "generated")
    feature = _find_plot_in_geojson_dir(plot_id, data_dir)

    if feature:
        records = db.query(LandRecord).filter(
            LandRecord.plot_id == plot_id,
            LandRecord.is_current == True
        ).all()
        return {
            "found": True,
            "parcel": feature,
            "records": [r.to_dict() for r in records]
        }

    # Fallback to database query if GeoJSON not found
    parcel = db.query(Parcel).filter(Parcel.plot_id == plot_id).first()

    if not parcel:
        return {"found": False, "plot_id": plot_id}

    records = db.query(LandRecord).filter(
        LandRecord.plot_id == plot_id,
        LandRecord.is_current == True
    ).all()

    return {
        "found": True,
        "parcel": parcel.to_geojson_feature(),
        "records": [r.to_dict() for r in records]
    }



@router.get("/owner")
def search_by_owner(
    name: str = Query(..., min_length=2, description="Owner name to search"),
    village_code: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Fuzzy search by owner name (Hindi or English)."""
    query = normalize_search_query(name)
    
    record_query = db.query(LandRecord).filter(
        LandRecord.is_current == True,
        or_(
            LandRecord.owner_name_hindi.ilike(f"%{query}%"),
            LandRecord.owner_name_english.ilike(f"%{query}%")
        )
    )
    
    if village_code:
        record_query = record_query.join(
            Parcel, LandRecord.parcel_id == Parcel.id
        ).filter(Parcel.village_code == village_code)
    
    records = record_query.limit(limit).all()
    
    return {
        "query": name,
        "total": len(records),
        "results": [r.to_dict() for r in records]
    }


@router.get("/autocomplete")
def autocomplete(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Autocomplete suggestions for search."""
    suggestions = []
    
    # Plot ID suggestions
    parcels = db.query(Parcel.plot_id).filter(
        Parcel.plot_id.ilike(f"{q}%")
    ).limit(limit // 2).all()
    
    for (plot_id,) in parcels:
        suggestions.append(AutocompleteResult(
            text=plot_id,
            type="plot_id",
            plot_id=plot_id
        ))
    
    # Owner name suggestions
    records = db.query(LandRecord.owner_name_hindi, LandRecord.plot_id).filter(
        LandRecord.is_current == True,
        LandRecord.owner_name_hindi.ilike(f"{q}%")
    ).limit(limit // 2).all()
    
    for name, plot_id in records:
        suggestions.append(AutocompleteResult(
            text=name,
            type="owner_name",
            plot_id=plot_id
        ))
    
    return suggestions
