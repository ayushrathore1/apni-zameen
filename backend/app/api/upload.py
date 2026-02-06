"""
Upload API router for admin file uploads (CSV, GeoJSON, Nakal OCR).
"""
import os
import uuid
import json
import csv
import io
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models.parcel import Parcel
from ..models.land_record import LandRecord
from ..services.ocr_service import OCRService
from ..services.data_seeder import DataSeeder

router = APIRouter(prefix="/upload", tags=["Upload"])

# In-memory job status storage (use Redis in production)
upload_jobs = {}


class UploadJobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    file_type: str
    filename: str
    records_parsed: int = 0
    records_seeded: int = 0
    errors: List[str] = []
    created_at: datetime
    completed_at: Optional[datetime] = None


class ParsedRecord(BaseModel):
    plot_id: Optional[str] = None
    owner_name_hindi: Optional[str] = None
    owner_name_english: Optional[str] = None
    father_name_hindi: Optional[str] = None
    recorded_area_sqm: Optional[float] = None
    recorded_area_text: Optional[str] = None
    khata_number: Optional[str] = None
    village_code: Optional[str] = None
    village_name: Optional[str] = None
    source_document: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    status: str
    message: str
    preview: List[dict] = []
    total_records: int = 0


@router.post("/csv", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    seed_immediately: bool = False,
    db: Session = Depends(get_db)
):
    """
    Upload and parse a CSV file containing land records.
    
    Expected CSV columns:
    - plot_id (required)
    - owner_name_hindi (required)
    - owner_name_english (optional)
    - father_name_hindi (optional)
    - recorded_area_sqm (optional)
    - recorded_area_text (optional)
    - khata_number (optional)
    - village_code (optional)
    - village_name (optional)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    job_id = str(uuid.uuid4())
    
    try:
        # Read and parse CSV
        content = await file.read()
        decoded = content.decode('utf-8-sig')  # Handle BOM
        reader = csv.DictReader(io.StringIO(decoded))
        
        records = []
        errors = []
        
        for i, row in enumerate(reader):
            try:
                # Validate required fields
                if not row.get('plot_id'):
                    errors.append(f"Row {i+1}: Missing plot_id")
                    continue
                if not row.get('owner_name_hindi'):
                    errors.append(f"Row {i+1}: Missing owner_name_hindi")
                    continue
                
                # Parse area
                area_sqm = None
                if row.get('recorded_area_sqm'):
                    try:
                        area_sqm = float(row['recorded_area_sqm'])
                    except ValueError:
                        pass
                
                record = {
                    'plot_id': row.get('plot_id', '').strip(),
                    'owner_name_hindi': row.get('owner_name_hindi', '').strip(),
                    'owner_name_english': row.get('owner_name_english', '').strip() or None,
                    'father_name_hindi': row.get('father_name_hindi', '').strip() or None,
                    'recorded_area_sqm': area_sqm,
                    'recorded_area_text': row.get('recorded_area_text', '').strip() or None,
                    'khata_number': row.get('khata_number', '').strip() or None,
                    'village_code': row.get('village_code', '').strip() or None,
                    'village_name': row.get('village_name', '').strip() or None,
                    'source_document': file.filename,
                }
                records.append(record)
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
        
        # Store job status
        upload_jobs[job_id] = UploadJobStatus(
            job_id=job_id,
            status='parsed',
            file_type='csv',
            filename=file.filename,
            records_parsed=len(records),
            errors=errors,
            created_at=datetime.utcnow()
        )
        
        # Seed immediately if requested
        seeded_count = 0
        if seed_immediately and records:
            seeder = DataSeeder(db)
            seeded_count = seeder.seed_land_records(records)
            upload_jobs[job_id].status = 'completed'
            upload_jobs[job_id].records_seeded = seeded_count
            upload_jobs[job_id].completed_at = datetime.utcnow()
        
        return UploadResponse(
            job_id=job_id,
            status=upload_jobs[job_id].status,
            message=f"Parsed {len(records)} records" + (f", seeded {seeded_count}" if seed_immediately else ""),
            preview=records[:10],  # First 10 for preview
            total_records=len(records)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")


@router.post("/geojson", response_model=UploadResponse)
async def upload_geojson(
    file: UploadFile = File(...),
    seed_immediately: bool = False,
    db: Session = Depends(get_db)
):
    """
    Upload and parse a GeoJSON file containing parcel geometries.
    
    Expected GeoJSON: FeatureCollection with Polygon features.
    Each feature should have properties:
    - plot_id (required)
    - village_code (optional)
    - village_name (optional)
    """
    if not file.filename.endswith(('.geojson', '.json')):
        raise HTTPException(status_code=400, detail="File must be GeoJSON")
    
    job_id = str(uuid.uuid4())
    
    try:
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        
        if data.get('type') != 'FeatureCollection':
            raise HTTPException(status_code=400, detail="GeoJSON must be a FeatureCollection")
        
        features = data.get('features', [])
        parcels = []
        errors = []
        
        for i, feature in enumerate(features):
            try:
                props = feature.get('properties', {})
                geom = feature.get('geometry')
                
                if not props.get('plot_id'):
                    errors.append(f"Feature {i+1}: Missing plot_id")
                    continue
                if not geom or geom.get('type') not in ('Polygon', 'MultiPolygon'):
                    errors.append(f"Feature {i+1}: Invalid or missing geometry")
                    continue
                
                parcel = {
                    'plot_id': props.get('plot_id'),
                    'village_code': props.get('village_code'),
                    'village_name': props.get('village_name'),
                    'geometry': geom,
                    'properties': props,
                }
                parcels.append(parcel)
            except Exception as e:
                errors.append(f"Feature {i+1}: {str(e)}")
        
        # Store job status
        upload_jobs[job_id] = UploadJobStatus(
            job_id=job_id,
            status='parsed',
            file_type='geojson',
            filename=file.filename,
            records_parsed=len(parcels),
            errors=errors,
            created_at=datetime.utcnow()
        )
        
        # Seed immediately if requested
        seeded_count = 0
        if seed_immediately and parcels:
            seeder = DataSeeder(db)
            seeded_count = seeder.seed_parcels(parcels)
            upload_jobs[job_id].status = 'completed'
            upload_jobs[job_id].records_seeded = seeded_count
            upload_jobs[job_id].completed_at = datetime.utcnow()
        
        # Preview (without full geometry)
        preview = [{
            'plot_id': p['plot_id'],
            'village_code': p['village_code'],
            'village_name': p['village_name'],
            'geometry_type': p['geometry']['type'],
        } for p in parcels[:10]]
        
        return UploadResponse(
            job_id=job_id,
            status=upload_jobs[job_id].status,
            message=f"Parsed {len(parcels)} parcels" + (f", seeded {seeded_count}" if seed_immediately else ""),
            preview=preview,
            total_records=len(parcels)
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse GeoJSON: {str(e)}")


@router.post("/nakal", response_model=UploadResponse)
async def upload_nakal(
    file: UploadFile = File(...),
    seed_immediately: bool = False,
    db: Session = Depends(get_db)
):
    """
    Upload a Nakal document (image or PDF) for OCR processing.
    
    Supports: JPEG, PNG, PDF
    Extracts: Owner name, Plot ID, Area, Khata number (in Hindi/English)
    """
    allowed_extensions = ('.jpg', '.jpeg', '.png', '.pdf')
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail=f"File must be one of: {allowed_extensions}")
    
    job_id = str(uuid.uuid4())
    
    try:
        content = await file.read()
        
        # Process with OCR
        ocr_service = OCRService()
        extracted_data = ocr_service.process_nakal(content, file.filename)
        
        if not extracted_data:
            raise HTTPException(status_code=422, detail="Could not extract data from document")
        
        records = [extracted_data] if isinstance(extracted_data, dict) else extracted_data
        
        # Store job status
        upload_jobs[job_id] = UploadJobStatus(
            job_id=job_id,
            status='parsed',
            file_type='nakal',
            filename=file.filename,
            records_parsed=len(records),
            errors=[],
            created_at=datetime.utcnow()
        )
        
        # Seed immediately if requested
        seeded_count = 0
        if seed_immediately and records:
            seeder = DataSeeder(db)
            seeded_count = seeder.seed_land_records(records)
            upload_jobs[job_id].status = 'completed'
            upload_jobs[job_id].records_seeded = seeded_count
            upload_jobs[job_id].completed_at = datetime.utcnow()
        
        return UploadResponse(
            job_id=job_id,
            status=upload_jobs[job_id].status,
            message=f"Extracted {len(records)} records from nakal" + (f", seeded {seeded_count}" if seed_immediately else ""),
            preview=records[:5],
            total_records=len(records)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.post("/seed/{job_id}")
async def seed_job_data(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Seed parsed data from a previous upload job into the database.
    """
    if job_id not in upload_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = upload_jobs[job_id]
    
    if job.status == 'completed':
        return {"message": "Job already seeded", "records_seeded": job.records_seeded}
    
    # TODO: Store parsed data in job for later seeding
    # For now, return error
    raise HTTPException(status_code=400, detail="Seeding not implemented for pre-parsed data. Use seed_immediately=true")


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Get the status of an upload job.
    """
    if job_id not in upload_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return upload_jobs[job_id]


@router.get("/jobs")
async def list_jobs(limit: int = 20):
    """
    List recent upload jobs.
    """
    jobs = sorted(upload_jobs.values(), key=lambda x: x.created_at, reverse=True)
    return {"jobs": [j.model_dump() for j in jobs[:limit]]}
