#!/usr/bin/env python
"""
Backup Script for Land Records Database

Creates timestamped backups of the database and exports
data in portable formats (GeoJSON, CSV).
"""
import os
import sys
import json
import csv
import subprocess
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Parcel, LandRecord, Discrepancy, ChangeLog
from app.config import settings


BACKUP_DIR = Path("data/backups")


def create_backup_dir() -> Path:
    """Create timestamped backup directory."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / timestamp
    backup_path.mkdir(parents=True, exist_ok=True)
    return backup_path


def backup_to_sql(backup_path: Path):
    """Create SQL dump backup using pg_dump."""
    output_file = backup_path / "database.sql"
    
    # Parse database URL
    db_url = settings.database_url
    # postgresql://user:pass@host:port/dbname
    
    print("Creating SQL dump...")
    try:
        # Use pg_dump if available
        result = subprocess.run(
            ["pg_dump", db_url, "-f", str(output_file)],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"  ✓ SQL dump saved to {output_file}")
        else:
            print(f"  ⚠ pg_dump failed: {result.stderr}")
    except FileNotFoundError:
        print("  ⚠ pg_dump not found, skipping SQL backup")


def export_parcels_geojson(backup_path: Path, db):
    """Export parcels to GeoJSON."""
    output_file = backup_path / "parcels.geojson"
    
    print("Exporting parcels to GeoJSON...")
    parcels = db.query(Parcel).all()
    
    features = []
    for parcel in parcels:
        try:
            feature = parcel.to_geojson_feature()
            features.append(feature)
        except Exception as e:
            print(f"  ⚠ Error exporting parcel {parcel.plot_id}: {e}")
    
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "exported_at": datetime.now().isoformat(),
            "total_parcels": len(features)
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ Exported {len(features)} parcels to {output_file}")


def export_records_csv(backup_path: Path, db):
    """Export land records to CSV."""
    output_file = backup_path / "land_records.csv"
    
    print("Exporting land records to CSV...")
    records = db.query(LandRecord).filter(LandRecord.is_current == True).all()
    
    fieldnames = [
        'id', 'plot_id', 'parcel_id', 'owner_name_hindi', 'owner_name_english',
        'father_name_hindi', 'father_name_english', 'recorded_area_sqm',
        'recorded_area_text', 'record_type', 'khata_number', 'khasra_number',
        'village_code', 'version', 'created_at', 'updated_at'
    ]
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in records:
            row = {
                'id': str(record.id),
                'plot_id': record.plot_id,
                'parcel_id': str(record.parcel_id) if record.parcel_id else '',
                'owner_name_hindi': record.owner_name_hindi or '',
                'owner_name_english': record.owner_name_english or '',
                'father_name_hindi': record.father_name_hindi or '',
                'father_name_english': record.father_name_english or '',
                'recorded_area_sqm': record.recorded_area_sqm or '',
                'recorded_area_text': record.recorded_area_text or '',
                'record_type': record.record_type or '',
                'khata_number': record.khata_number or '',
                'khasra_number': record.khasra_number or '',
                'village_code': '',  # Extract from plot_id if needed
                'version': record.version,
                'created_at': record.created_at.isoformat() if record.created_at else '',
                'updated_at': record.updated_at.isoformat() if record.updated_at else ''
            }
            writer.writerow(row)
    
    print(f"  ✓ Exported {len(records)} records to {output_file}")


def export_discrepancies_json(backup_path: Path, db):
    """Export discrepancies to JSON."""
    output_file = backup_path / "discrepancies.json"
    
    print("Exporting discrepancies to JSON...")
    discrepancies = db.query(Discrepancy).all()
    
    data = []
    for disc in discrepancies:
        data.append({
            'id': str(disc.id),
            'plot_id': disc.plot_id,
            'parcel_id': str(disc.parcel_id) if disc.parcel_id else None,
            'record_id': str(disc.record_id) if disc.record_id else None,
            'discrepancy_type': disc.discrepancy_type,
            'severity': disc.severity,
            'status': disc.status,
            'explanation': disc.explanation,
            'explanation_hindi': disc.explanation_hindi,
            'details': disc.details,
            'created_at': disc.created_at.isoformat() if disc.created_at else None,
            'resolved_at': disc.resolved_at.isoformat() if disc.resolved_at else None,
            'resolved_by': disc.resolved_by
        })
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ Exported {len(data)} discrepancies to {output_file}")


def export_audit_log(backup_path: Path, db):
    """Export change log to JSON."""
    output_file = backup_path / "audit_log.json"
    
    print("Exporting audit log...")
    logs = db.query(ChangeLog).order_by(ChangeLog.timestamp.desc()).limit(10000).all()
    
    data = []
    for log in logs:
        data.append({
            'id': str(log.id),
            'entity_type': log.entity_type,
            'entity_id': str(log.entity_id),
            'action': log.action,
            'old_values': log.old_values,
            'new_values': log.new_values,
            'user_name': log.user_name,
            'user_role': log.user_role,
            'remarks': log.remarks,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None
        })
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ Exported {len(data)} audit log entries to {output_file}")


def create_manifest(backup_path: Path, stats: dict):
    """Create backup manifest file."""
    manifest = {
        'backup_timestamp': datetime.now().isoformat(),
        'backup_path': str(backup_path),
        'database_url': settings.database_url.split('@')[-1],  # Remove credentials
        'statistics': stats,
        'files': [f.name for f in backup_path.iterdir()]
    }
    
    with open(backup_path / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)


def run_backup():
    """Run complete backup process."""
    print("=" * 50)
    print("Land Records Database Backup")
    print("=" * 50)
    print()
    
    backup_path = create_backup_dir()
    print(f"Backup directory: {backup_path}")
    print()
    
    db = SessionLocal()
    stats = {}
    
    try:
        # SQL dump
        backup_to_sql(backup_path)
        
        # GeoJSON export
        export_parcels_geojson(backup_path, db)
        stats['parcels'] = db.query(Parcel).count()
        
        # CSV export
        export_records_csv(backup_path, db)
        stats['records'] = db.query(LandRecord).filter(LandRecord.is_current == True).count()
        
        # Discrepancies
        export_discrepancies_json(backup_path, db)
        stats['discrepancies'] = db.query(Discrepancy).count()
        
        # Audit log
        export_audit_log(backup_path, db)
        stats['audit_entries'] = db.query(ChangeLog).count()
        
        # Manifest
        create_manifest(backup_path, stats)
        
        print()
        print("=" * 50)
        print("✓ Backup completed successfully!")
        print(f"  Location: {backup_path}")
        print(f"  Parcels: {stats.get('parcels', 0)}")
        print(f"  Records: {stats.get('records', 0)}")
        print(f"  Discrepancies: {stats.get('discrepancies', 0)}")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n✗ Backup failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_backup()
