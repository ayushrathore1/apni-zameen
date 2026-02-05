"""
Generate synthetic land record data for testing.
Creates realistic parcels, records, and deliberate discrepancies.
"""
import sys
import os
import json
import random
import uuid
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon, Point
from shapely import wkt

from app.database import SessionLocal
from app.models import Parcel, LandRecord

# Hindi names for realistic data
HINDI_FIRST_NAMES = [
    "राम", "श्याम", "मोहन", "सोहन", "रामू", "गोपाल", "हरि", "कृष्ण",
    "सीता", "गीता", "राधा", "लक्ष्मी", "पार्वती", "सरस्वती", "दुर्गा",
    "राजेश", "सुरेश", "महेश", "दिनेश", "रमेश", "विनोद", "अनिल"
]

HINDI_LAST_NAMES = [
    "शर्मा", "वर्मा", "सिंह", "यादव", "गुप्ता", "पटेल", "राय",
    "त्रिपाठी", "पांडेय", "मिश्रा", "तिवारी", "दुबे", "चौहान"
]

# Bhinay Block, Ajmer District, Rajasthan - Real Village Data
VILLAGE_DATA = [
    {
        "code": "172035", 
        "name": "Gordhanpura", 
        "name_hi": "गोर्धनपुरा",
        "center": (74.732802, 26.068699),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
        "boundary_wkt": "MULTIPOLYGON(((74.7402656265484 26.07138064379...)))"
    },
    {
        "code": "173109", 
        "name": "Gujarwara", 
        "name_hi": "गुजरवाड़ा",
        "center": (74.796568, 26.079869),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
        "boundary_wkt": "MULTIPOLYGON(((74.8054530439663 26.08621875076...)))"
    },
    {
        "code": "173457", 
        "name": "Jhanbarkiya", 
        "name_hi": "झानबरकिया",
        "center": (74.763894, 25.981195),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
        "boundary_wkt": "MULTIPOLYGON(((74.7714348333626 25.99187704046...)))"
    },
    {
        "code": "173574", 
        "name": "Neemra (Kerot)", 
        "name_hi": "नीमड़ा (केरोट)",
        "center": (74.968747, 25.949975),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
        "boundary_wkt": "MULTIPOLYGON(((74.9625114451384 25.96820136564...)))"
    },
    {
        "code": "172618", 
        "name": "Padaliya (Bhinay)", 
        "name_hi": "पाडलिया (भीनाय)",
        "center": (74.895811, 25.960581),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
        "boundary_wkt": "MULTIPOLYGON(((74.9039756348093 25.98101813887...)))"
    },
]


def generate_polygon(center_lon: float, center_lat: float, size: float = 0.001) -> Polygon:
    """Generate a random quadrilateral parcel around a center point."""
    # Random offsets for irregular quadrilateral
    offsets = [
        (random.uniform(-size, -size/2), random.uniform(-size, -size/2)),
        (random.uniform(size/2, size), random.uniform(-size, -size/2)),
        (random.uniform(size/2, size), random.uniform(size/2, size)),
        (random.uniform(-size, -size/2), random.uniform(size/2, size)),
    ]
    
    coords = [(center_lon + dx, center_lat + dy) for dx, dy in offsets]
    coords.append(coords[0])  # Close the polygon
    
    return Polygon(coords)


def generate_hindi_name() -> str:
    """Generate a random Hindi name."""
    first = random.choice(HINDI_FIRST_NAMES)
    last = random.choice(HINDI_LAST_NAMES)
    return f"{first} {last}"


def transliterate_rough(hindi_name: str) -> str:
    """Rough transliteration for English name (simplified)."""
    # Simple mapping for common parts
    mapping = {
        "राम": "Ram", "श्याम": "Shyam", "मोहन": "Mohan", "सोहन": "Sohan",
        "गोपाल": "Gopal", "हरि": "Hari", "कृष्ण": "Krishna", "सीता": "Sita",
        "गीता": "Geeta", "राधा": "Radha", "लक्ष्मी": "Lakshmi",
        "राजेश": "Rajesh", "सुरेश": "Suresh", "महेश": "Mahesh",
        "शर्मा": "Sharma", "वर्मा": "Verma", "सिंह": "Singh",
        "यादव": "Yadav", "गुप्ता": "Gupta", "पटेल": "Patel",
        "त्रिपाठी": "Tripathi", "पांडेय": "Pandey", "मिश्रा": "Mishra"
    }
    
    result = hindi_name
    for hindi, eng in mapping.items():
        result = result.replace(hindi, eng)
    
    return result if result != hindi_name else "Unknown"


def generate_sample_data(num_parcels_per_village: int = 100):
    """Generate synthetic parcels and records."""
    db = SessionLocal()
    
    try:
        print("Generating synthetic data...")
        
        parcels_created = 0
        records_created = 0
        
        for village in VILLAGE_DATA:
            print(f"\n  Village: {village['name']} ({village['code']})")
            center_lon, center_lat = village["center"]
            
            for i in range(num_parcels_per_village):
                # Generate parcel position (spread around village center)
                lon_offset = random.uniform(-0.02, 0.02)
                lat_offset = random.uniform(-0.02, 0.02)
                parcel_center = (center_lon + lon_offset, center_lat + lat_offset)
                
                # Generate geometry
                size = random.uniform(0.0005, 0.002)
                polygon = generate_polygon(parcel_center[0], parcel_center[1], size)
                centroid = polygon.centroid
                computed_area = polygon.area * 111000 * 111000  # Rough sq meters
                
                # Plot ID format: village/block/number
                plot_id = f"{village['code']}/{random.randint(1,20)}/{i+1}"
                
                # Create parcel
                parcel = Parcel(
                    id=uuid.uuid4(),
                    plot_id=plot_id,
                    village_code=village["code"],
                    village_name=village.get("name_hi", village["name"]),
                    geometry=from_shape(polygon, srid=4326),
                    centroid=from_shape(centroid, srid=4326),
                    computed_area_sqm=round(computed_area, 2)
                )
                db.add(parcel)
                parcels_created += 1
                
                # Create land record
                # Introduce deliberate discrepancies for testing
                owner_name = generate_hindi_name()
                
                # Area discrepancy (20% of records)
                if random.random() < 0.20:
                    variation = random.uniform(0.05, 0.40)  # 5-40% off
                    if random.random() < 0.5:
                        recorded_area = computed_area * (1 + variation)
                    else:
                        recorded_area = computed_area * (1 - variation)
                else:
                    recorded_area = computed_area * random.uniform(0.98, 1.02)
                
                # Some records missing (5%)
                if random.random() < 0.95:
                    record = LandRecord(
                        id=uuid.uuid4(),
                        plot_id=plot_id,
                        parcel_id=parcel.id,
                        owner_name_hindi=owner_name,
                        owner_name_english=transliterate_rough(owner_name),
                        father_name_hindi=generate_hindi_name(),
                        recorded_area_sqm=round(recorded_area, 2),
                        recorded_area_text=f"{recorded_area/10000:.2f} हेक्टेयर",
                        record_type="खतौनी",
                        khata_number=str(random.randint(1, 500)),
                        version=1,
                        is_current=True
                    )
                    db.add(record)
                    records_created += 1
            
            print(f"    Created {num_parcels_per_village} parcels")
        
        db.commit()
        
        print(f"\n✓ Generated {parcels_created} parcels and {records_created} records")
        print("\nDiscrepancy types introduced:")
        print("  - ~20% area mismatches (5-40% variation)")
        print("  - ~5% missing records")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


def export_geojson(output_path: str = "data/sample/parcels.geojson"):
    """Export parcels to GeoJSON file."""
    db = SessionLocal()
    
    try:
        parcels = db.query(Parcel).all()
        
        features = [p.to_geojson_feature() for p in parcels]
        
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Exported {len(features)} parcels to {output_path}")
        
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate synthetic land data")
    parser.add_argument("--count", type=int, default=100, 
                       help="Number of parcels per village")
    parser.add_argument("--export", action="store_true",
                       help="Export to GeoJSON after generation")
    
    args = parser.parse_args()
    
    generate_sample_data(args.count)
    
    if args.export:
        export_geojson()
