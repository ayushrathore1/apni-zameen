"""
Data Export API

Provides endpoints for exporting data in standard formats:
- GeoJSON for spatial data
- CSV for tabular data
- JSON for structured data
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import StringIO
import csv
import json
from datetime import datetime

from app.database import get_db
from app.models import Parcel, LandRecord, Discrepancy


router = APIRouter(prefix="/export", tags=["Data Export"])


@router.get("/parcels/geojson")
def export_parcels_geojson(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    db: Session = Depends(get_db)
):
    """
    Export all parcels as GeoJSON FeatureCollection.
    
    Standard GeoJSON format compatible with QGIS, Mapbox, etc.
    """
    query = db.query(Parcel)
    if village_code:
        query = query.filter(Parcel.village_code == village_code)
    
    parcels = query.all()
    
    features = []
    for parcel in parcels:
        try:
            features.append(parcel.to_geojson_feature())
        except Exception:
            continue
    
    geojson = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}
        },
        "features": features,
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "total_features": len(features),
            "source": "Land Record Digitization Assistant",
            "village_code": village_code
        }
    }
    
    return Response(
        content=json.dumps(geojson, ensure_ascii=False, indent=2),
        media_type="application/geo+json",
        headers={
            "Content-Disposition": f"attachment; filename=parcels_{village_code or 'all'}_{datetime.now().strftime('%Y%m%d')}.geojson"
        }
    )


@router.get("/records/csv")
def export_records_csv(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    current_only: bool = Query(True, description="Only current records"),
    db: Session = Depends(get_db)
):
    """
    Export land records as CSV.
    
    Compatible with Excel, LibreOffice, and data analysis tools.
    """
    query = db.query(LandRecord)
    if current_only:
        query = query.filter(LandRecord.is_current == True)
    if village_code:
        query = query.filter(LandRecord.plot_id.like(f'{village_code}%'))
    
    records = query.all()
    
    output = StringIO()
    fieldnames = [
        'plot_id', 'owner_name_hindi', 'owner_name_english',
        'father_name_hindi', 'father_name_english',
        'recorded_area_sqm', 'recorded_area_text',
        'record_type', 'khata_number', 'khasra_number',
        'source_document', 'source_date', 'version', 
        'is_current', 'created_at', 'updated_at'
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for record in records:
        writer.writerow({
            'plot_id': record.plot_id,
            'owner_name_hindi': record.owner_name_hindi or '',
            'owner_name_english': record.owner_name_english or '',
            'father_name_hindi': record.father_name_hindi or '',
            'father_name_english': record.father_name_english or '',
            'recorded_area_sqm': record.recorded_area_sqm or '',
            'recorded_area_text': record.recorded_area_text or '',
            'record_type': record.record_type or '',
            'khata_number': record.khata_number or '',
            'khasra_number': record.khasra_number or '',
            'source_document': record.source_document or '',
            'source_date': record.source_date.isoformat() if record.source_date else '',
            'version': record.version,
            'is_current': record.is_current,
            'created_at': record.created_at.isoformat() if record.created_at else '',
            'updated_at': record.updated_at.isoformat() if record.updated_at else ''
        })
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=land_records_{village_code or 'all'}_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/discrepancies/json")
def export_discrepancies_json(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    db: Session = Depends(get_db)
):
    """
    Export discrepancies as JSON.
    
    Includes full details and metadata for analysis.
    """
    query = db.query(Discrepancy)
    
    if village_code:
        query = query.filter(Discrepancy.plot_id.like(f'{village_code}%'))
    if status:
        query = query.filter(Discrepancy.status == status)
    if severity:
        query = query.filter(Discrepancy.severity == severity)
    
    discrepancies = query.order_by(Discrepancy.created_at.desc()).all()
    
    data = {
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "total_count": len(discrepancies),
            "filters": {
                "village_code": village_code,
                "status": status,
                "severity": severity
            }
        },
        "discrepancies": [
            {
                "id": str(d.id),
                "plot_id": d.plot_id,
                "parcel_id": str(d.parcel_id) if d.parcel_id else None,
                "record_id": str(d.record_id) if d.record_id else None,
                "type": d.discrepancy_type,
                "severity": d.severity,
                "status": d.status,
                "explanation": d.explanation,
                "explanation_hindi": d.explanation_hindi,
                "details": d.details,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
                "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
                "resolved_by": d.resolved_by,
                "resolution_remarks": d.resolution_remarks
            }
            for d in discrepancies
        ]
    }
    
    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=discrepancies_{datetime.now().strftime('%Y%m%d')}.json"
        }
    )


@router.get("/summary")
def get_export_summary(
    village_code: Optional[str] = Query(None, description="Filter by village"),
    db: Session = Depends(get_db)
):
    """
    Get summary of available data for export.
    """
    parcel_query = db.query(Parcel)
    record_query = db.query(LandRecord).filter(LandRecord.is_current == True)
    disc_query = db.query(Discrepancy)
    
    if village_code:
        parcel_query = parcel_query.filter(Parcel.village_code == village_code)
        record_query = record_query.filter(LandRecord.plot_id.like(f'{village_code}%'))
        disc_query = disc_query.filter(Discrepancy.plot_id.like(f'{village_code}%'))
    
    return {
        "village_code": village_code,
        "parcels_count": parcel_query.count(),
        "records_count": record_query.count(),
        "discrepancies_count": disc_query.count(),
        "available_formats": {
            "parcels": ["geojson"],
            "records": ["csv"],
            "discrepancies": ["json"]
        },
        "export_endpoints": {
            "parcels": "/api/export/parcels/geojson",
            "records": "/api/export/records/csv",
            "discrepancies": "/api/export/discrepancies/json"
        }
    }
