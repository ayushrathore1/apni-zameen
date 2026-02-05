"""
Load generated GeoJSON parcel data into the database.
This script reads the generated GeoJSON files and inserts parcels into PostgreSQL.
"""
import sys
import os
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from shapely.geometry import shape
from geoalchemy2.shape import from_shape

from app.database import engine, SessionLocal, Base
from app.models import Parcel, LandRecord


def load_geojson_to_db(geojson_path: str, clear_existing: bool = True):
    """Load GeoJSON features into the database."""
    
    # Read GeoJSON file
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"Loading {len(features)} parcels from {geojson_path}")
    
    # Create session
    db = SessionLocal()
    
    try:
        if clear_existing:
            # Clear existing data
            db.query(LandRecord).delete()
            db.query(Parcel).delete()
            db.commit()
            print("Cleared existing parcels and land records")
        
        parcels_created = 0
        records_created = 0
        
        for feature in features:
            props = feature.get('properties', {})
            geom = feature.get('geometry')
            
            if not geom:
                continue
            
            # Create Shapely geometry
            shapely_geom = shape(geom)
            centroid = shapely_geom.centroid
            
            # Create Parcel
            parcel = Parcel(
                plot_id=props.get('plot_id'),
                village_code=props.get('village_code'),
                village_name=props.get('village_name'),
                geometry=from_shape(shapely_geom, srid=4326),
                centroid=from_shape(centroid, srid=4326),
                computed_area_sqm=props.get('computed_area_sqm'),
            )
            db.add(parcel)
            db.flush()  # Get parcel ID
            parcels_created += 1
            
            # Create LandRecord
            land_record = LandRecord(
                plot_id=props.get('plot_id'),
                parcel_id=parcel.id,
                owner_name_hindi=props.get('owner_name_hi'),
                owner_name_english=props.get('owner_name_en'),
                father_name_hindi=props.get('father_name_hi'),
                father_name_english=props.get('father_name_en'),
                recorded_area_sqm=props.get('recorded_area_sqm'),
                recorded_area_text=props.get('area_text'),
                record_type='jamabandi',
                khata_number=props.get('khata_number'),
                is_current=True,
            )
            db.add(land_record)
            records_created += 1
        
        db.commit()
        print(f"SUCCESS: Created {parcels_created} parcels and {records_created} land records")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Load GeoJSON parcels into database")
    parser.add_argument("--file", type=str, 
                       default=os.path.join(os.path.dirname(__file__), "..", "..", "data", "generated", "bhinay_all_parcels.geojson"),
                       help="Path to GeoJSON file")
    parser.add_argument("--no-clear", action="store_true",
                       help="Don't clear existing data before loading")
    
    args = parser.parse_args()
    
    # Ensure tables exist
    from app.database import init_db
    init_db()
    
    load_geojson_to_db(args.file, clear_existing=not args.no_clear)
