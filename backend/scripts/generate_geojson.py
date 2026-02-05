"""
Generate realistic GeoJSON parcel data with ownership records.
This script creates polygon parcels and exports them as GeoJSON files.
"""
import sys
import os
import io
import json
import random
import math
from datetime import datetime, timedelta

# Fix Windows console encoding for Hindi characters
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

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
    },
    {
        "code": "173109", 
        "name": "Gujarwara", 
        "name_hi": "गुजरवाड़ा",
        "center": (74.796568, 26.079869),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
    },
    {
        "code": "173457", 
        "name": "Jhanbarkiya", 
        "name_hi": "झानबरकिया",
        "center": (74.763894, 25.981195),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
    },
    {
        "code": "173574", 
        "name": "Neemra (Kerot)", 
        "name_hi": "नीमड़ा (केरोट)",
        "center": (74.968747, 25.949975),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
    },
    {
        "code": "172618", 
        "name": "Padaliya (Bhinay)", 
        "name_hi": "पाडलिया (भीनाय)",
        "center": (74.895811, 25.960581),
        "block": "BHINAY",
        "district": "AJMER",
        "state": "Rajasthan",
    },
]

# Hindi names for realistic data
HINDI_FIRST_NAMES = [
    "राम", "श्याम", "मोहन", "सोहन", "रामू", "गोपाल", "हरि", "कृष्ण",
    "सीता", "गीता", "राधा", "लक्ष्मी", "पार्वती", "सरस्वती", "दुर्गा",
    "राजेश", "सुरेश", "महेश", "दिनेश", "रमेश", "विनोद", "अनिल",
    "भगवान", "नारायण", "विष्णु", "शंकर", "ब्रजेश", "जगदीश"
]

HINDI_LAST_NAMES = [
    "शर्मा", "वर्मा", "सिंह", "यादव", "गुप्ता", "पटेल", "राय",
    "त्रिपाठी", "पांडेय", "मिश्रा", "तिवारी", "दुबे", "चौहान",
    "राजपूत", "मीना", "गुर्जर", "जाट", "कुमावत"
]

# Land type classifications
LAND_TYPES = [
    {"type": "agricultural", "type_hi": "कृषि भूमि", "code": "AGR"},
    {"type": "residential", "type_hi": "आवासीय", "code": "RES"},
    {"type": "commercial", "type_hi": "वाणिज्यिक", "code": "COM"},
    {"type": "barren", "type_hi": "बंजर", "code": "BAR"},
    {"type": "forest", "type_hi": "वन भूमि", "code": "FOR"},
]

# Transliteration mapping
TRANSLITERATION = {
    "राम": "Ram", "श्याम": "Shyam", "मोहन": "Mohan", "सोहन": "Sohan",
    "गोपाल": "Gopal", "हरि": "Hari", "कृष्ण": "Krishna", "सीता": "Sita",
    "गीता": "Geeta", "राधा": "Radha", "लक्ष्मी": "Lakshmi", "रामू": "Ramu",
    "राजेश": "Rajesh", "सुरेश": "Suresh", "महेश": "Mahesh", "दिनेश": "Dinesh",
    "रमेश": "Ramesh", "विनोद": "Vinod", "अनिल": "Anil", "पार्वती": "Parvati",
    "सरस्वती": "Saraswati", "दुर्गा": "Durga", "भगवान": "Bhagwan",
    "नारायण": "Narayan", "विष्णु": "Vishnu", "शंकर": "Shankar",
    "ब्रजेश": "Brajesh", "जगदीश": "Jagdish",
    "शर्मा": "Sharma", "वर्मा": "Verma", "सिंह": "Singh",
    "यादव": "Yadav", "गुप्ता": "Gupta", "पटेल": "Patel", "राय": "Rai",
    "त्रिपाठी": "Tripathi", "पांडेय": "Pandey", "मिश्रा": "Mishra",
    "तिवारी": "Tiwari", "दुबे": "Dubey", "चौहान": "Chauhan",
    "राजपूत": "Rajput", "मीना": "Meena", "गुर्जर": "Gurjar",
    "जाट": "Jat", "कुमावत": "Kumawat"
}


def transliterate(hindi_text: str) -> str:
    """Convert Hindi text to English approximation."""
    result = hindi_text
    for hindi, eng in TRANSLITERATION.items():
        result = result.replace(hindi, eng)
    return result if result != hindi_text else "Unknown"


def generate_hindi_name() -> tuple:
    """Generate a random Hindi name with English transliteration."""
    first = random.choice(HINDI_FIRST_NAMES)
    last = random.choice(HINDI_LAST_NAMES)
    hindi_name = f"{first} {last}"
    english_name = f"{TRANSLITERATION.get(first, first)} {TRANSLITERATION.get(last, last)}"
    return hindi_name, english_name


def generate_rectangular_parcel(center_lon: float, center_lat: float, 
                                  width: float, height: float, 
                                  rotation: float = 0) -> list:
    """Generate a rectangular parcel polygon."""
    # Create rectangle corners
    corners = [
        (-width/2, -height/2),
        (width/2, -height/2),
        (width/2, height/2),
        (-width/2, height/2),
    ]
    
    # Apply rotation
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)
    rotated = []
    for x, y in corners:
        rx = x * cos_r - y * sin_r
        ry = x * sin_r + y * cos_r
        rotated.append((center_lon + rx, center_lat + ry))
    
    # Close polygon
    rotated.append(rotated[0])
    return rotated


def generate_irregular_parcel(center_lon: float, center_lat: float,
                               size: float) -> list:
    """Generate an irregular quadrilateral parcel."""
    # Create irregular quadrilateral
    offsets = [
        (random.uniform(-size, -size/2), random.uniform(-size, -size/2)),
        (random.uniform(size/2, size), random.uniform(-size, -size/2)),
        (random.uniform(size/2, size), random.uniform(size/2, size)),
        (random.uniform(-size, -size/2), random.uniform(size/2, size)),
    ]
    
    coords = [(center_lon + dx, center_lat + dy) for dx, dy in offsets]
    coords.append(coords[0])  # Close polygon
    return coords


def generate_realistic_parcel(center_lon: float, center_lat: float,
                              size: float, shape_type: str = None) -> list:
    """
    Generate realistic parcel shapes matching actual cadastral boundaries.
    Supports: triangle, rectangle, quadrilateral, pentagon, hexagon, L-shape, irregular
    """
    if shape_type is None:
        # Weighted random selection for realistic distribution
        shape_type = random.choices(
            ['triangle', 'quadrilateral', 'pentagon', 'hexagon', 'L-shape', 'irregular'],
            weights=[0.08, 0.40, 0.15, 0.07, 0.10, 0.20]  # Most are quads, some irregular
        )[0]
    
    # Random rotation for variety
    rotation = random.uniform(0, 2 * math.pi)
    
    if shape_type == 'triangle':
        # Triangular plot (common for corner plots)
        num_vertices = 3
        base_angles = [0, 2*math.pi/3, 4*math.pi/3]
        
    elif shape_type == 'quadrilateral':
        # Irregular quadrilateral (most common farm shape)
        num_vertices = 4
        base_angles = [math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4]
        
    elif shape_type == 'pentagon':
        # 5-sided plot
        num_vertices = 5
        base_angles = [i * 2*math.pi/5 for i in range(5)]
        
    elif shape_type == 'hexagon':
        # 6-sided plot
        num_vertices = 6
        base_angles = [i * 2*math.pi/6 for i in range(6)]
        
    elif shape_type == 'L-shape':
        # L-shaped plot (common around buildings, roads)
        # Create L from 6 points
        w = size * random.uniform(0.8, 1.2)
        h = size * random.uniform(0.8, 1.2)
        cut_w = w * random.uniform(0.3, 0.6)
        cut_h = h * random.uniform(0.3, 0.6)
        
        # L-shape vertices (before rotation)
        offsets = [
            (0, 0),
            (w, 0),
            (w, h - cut_h),
            (w - cut_w, h - cut_h),
            (w - cut_w, h),
            (0, h),
        ]
        
        # Center the shape
        cx = w / 2
        cy = h / 2
        offsets = [(x - cx, y - cy) for x, y in offsets]
        
        # Apply rotation and create coordinates
        cos_r = math.cos(rotation)
        sin_r = math.sin(rotation)
        coords = []
        for ox, oy in offsets:
            rx = ox * cos_r - oy * sin_r
            ry = ox * sin_r + oy * cos_r
            coords.append((center_lon + rx * size, center_lat + ry * size))
        coords.append(coords[0])
        return coords
        
    else:  # 'irregular' - truly irregular polygon with 5-8 vertices
        num_vertices = random.randint(5, 8)
        base_angles = [i * 2*math.pi/num_vertices for i in range(num_vertices)]
    
    # Generate vertices with random radius variation
    coords = []
    for i, base_angle in enumerate(base_angles):
        # Add slight angle variation
        angle = base_angle + rotation + random.uniform(-0.2, 0.2)
        # Random radius for irregular shapes
        radius = size * random.uniform(0.6, 1.0)
        
        dx = radius * math.cos(angle)
        dy = radius * math.sin(angle)
        coords.append((center_lon + dx, center_lat + dy))
    
    # Close polygon
    coords.append(coords[0])
    return coords


def calculate_area_sqm(coords: list) -> float:
    """Calculate polygon area in square meters using Shoelace formula."""
    n = len(coords) - 1  # Exclude closing point
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += coords[i][0] * coords[j][1]
        area -= coords[j][0] * coords[i][1]
    area = abs(area) / 2.0
    # Convert from degrees to meters (rough approximation)
    area_sqm = area * 111000 * 111000 * math.cos(math.radians(coords[0][1]))
    return round(area_sqm, 2)


def generate_parcels_for_village(village: dict, num_parcels: int = 50) -> list:
    """Generate parcels for a single village with detailed ownership data."""
    parcels = []
    center_lon, center_lat = village["center"]
    
    # Create grid-like layout with some randomness
    grid_size = int(math.sqrt(num_parcels)) + 1
    cell_size = 0.0008  # ~80m cells for realistic plot spacing
    
    # Irrigation types
    IRRIGATION_TYPES = ["नहर", "कुआं", "ट्यूबवेल", "तालाब", "वर्षा आधारित", "कोई नहीं"]
    IRRIGATION_TYPES_EN = ["Canal", "Well", "Tube Well", "Pond", "Rain Fed", "None"]
    
    # Crop types for agricultural land
    CROP_TYPES = ["गेहूं", "चावल", "बाजरा", "मक्का", "सरसों", "चना", "मूंग", "अन्य"]
    CROP_TYPES_EN = ["Wheat", "Rice", "Millet", "Maize", "Mustard", "Gram", "Moong", "Other"]
    
    # Soil types
    SOIL_TYPES = ["दोमट", "बलुई", "चिकनी", "काली", "लाल"]
    SOIL_TYPES_EN = ["Loamy", "Sandy", "Clay", "Black", "Red"]
    
    # Document source types
    DOCUMENT_SOURCES = ["खसरा", "बी-1", "खतौनी", "जमाबंदी", "पट्टा"]
    
    parcel_num = 0
    for row in range(grid_size):
        for col in range(grid_size):
            if parcel_num >= num_parcels:
                break
            
            # Calculate parcel center with some randomness
            base_lon = center_lon - (grid_size/2 * cell_size) + (col * cell_size)
            base_lat = center_lat - (grid_size/2 * cell_size) + (row * cell_size)
            
            # Add random offset
            parcel_lon = base_lon + random.uniform(-cell_size/4, cell_size/4)
            parcel_lat = base_lat + random.uniform(-cell_size/4, cell_size/4)
            
            # Generate parcel shape - realistic diverse shapes
            # Size in degrees: 0.00015-0.0004 ≈ 15-45 meters
            size = random.uniform(0.00015, 0.0004)
            coords = generate_realistic_parcel(parcel_lon, parcel_lat, size)
            
            # Calculate area from geometry (computed area)
            computed_area = calculate_area_sqm(coords)
            
            # Generate plot ID
            khasra_num = random.randint(1, 999)
            plot_id = f"{village['code']}/{khasra_num}/{parcel_num + 1}"
            
            # Generate ownership data
            owner_hindi, owner_english = generate_hindi_name()
            father_hindi, father_english = generate_hindi_name()
            
            # Select land type (weighted towards agricultural)
            land_type = random.choices(
                LAND_TYPES,
                weights=[0.6, 0.2, 0.05, 0.1, 0.05]
            )[0]
            
            # Generate discrepancy data (20% have discrepancies for realistic testing)
            discrepancy_percentage = 0
            if random.random() < 0.20:  # 20% have discrepancy
                variation = random.uniform(0.15, 0.40)  # 15-40% variation
                if random.random() < 0.5:
                    recorded_area = computed_area * (1 + variation)
                    discrepancy_percentage = round(variation * 100, 1)
                else:
                    recorded_area = computed_area * (1 - variation)
                    discrepancy_percentage = round(-variation * 100, 1)
                has_discrepancy = True
                discrepancy_severity = "high" if abs(variation) > 0.25 else "medium"
            else:
                recorded_area = computed_area * random.uniform(0.98, 1.02)  # Minor variations
                has_discrepancy = False
                discrepancy_severity = None
            
            area_difference = recorded_area - computed_area
            
            # Area in local units (Bigha-Biswa system)
            bigha = recorded_area / 2500  # Approximate conversion
            biswa = (bigha % 1) * 20
            area_text = f"{int(bigha)} बीघा {int(biswa)} बिस्वा"
            
            # Generate survey and document information
            survey_year = random.randint(2015, 2024)
            acquisition_year = random.choice([None, random.randint(1970, 2020)])
            
            # Irrigation details (for agricultural land)
            irr_idx = random.randint(0, len(IRRIGATION_TYPES) - 1)
            irrigation_type = IRRIGATION_TYPES[irr_idx]
            irrigation_type_en = IRRIGATION_TYPES_EN[irr_idx]
            
            # Generate crop info for agricultural land
            if land_type["type"] == "agricultural":
                crop_idx = random.randint(0, len(CROP_TYPES) - 1)
                current_crop = CROP_TYPES[crop_idx]
                current_crop_en = CROP_TYPES_EN[crop_idx]
                is_irrigated = irr_idx < 4  # First 4 are irrigated
            else:
                current_crop = None
                current_crop_en = None
                is_irrigated = False
            
            # Soil type
            soil_idx = random.randint(0, len(SOIL_TYPES) - 1)
            soil_type = SOIL_TYPES[soil_idx]
            soil_type_en = SOIL_TYPES_EN[soil_idx]
            
            # Valuation
            base_rate = {
                "agricultural": random.randint(500, 2000),
                "residential": random.randint(5000, 20000),
                "commercial": random.randint(15000, 50000),
                "barren": random.randint(100, 500),
                "forest": random.randint(200, 800),
            }
            rate_per_sqm = base_rate.get(land_type["type"], 1000)
            estimated_value = round(recorded_area * rate_per_sqm, 2)
            
            # Document reference
            doc_source = random.choice(DOCUMENT_SOURCES)
            doc_page = random.randint(1, 200)
            doc_year = random.randint(2018, 2024)
            
            # Mutation history
            num_mutations = random.randint(0, 5)
            mutations = []
            for m in range(num_mutations):
                mut_year = random.randint(1990, 2024)
                mut_type = random.choice(["विरासत", "बिक्री", "दान", "बंटवारा"])
                mutations.append({"year": mut_year, "type": mut_type})
            
            # Generate centroid for zoom functionality
            centroid_lon = sum(c[0] for c in coords[:-1]) / (len(coords) - 1)
            centroid_lat = sum(c[1] for c in coords[:-1]) / (len(coords) - 1)
            
            parcel = {
                "type": "Feature",
                "id": f"{village['code']}_{parcel_num + 1}",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                },
                "properties": {
                    # ======= PARCEL IDENTIFICATION =======
                    "plot_id": plot_id,
                    "khasra_number": str(khasra_num),
                    "khata_number": str(random.randint(1, 500)),
                    "khatauni_number": str(random.randint(1, 1000)),
                    
                    # ======= LOCATION =======
                    "village_code": village["code"],
                    "village_name": village["name"],
                    "village_name_hi": village["name_hi"],
                    "block": village["block"],
                    "district": village["district"],
                    "state": village["state"],
                    "centroid_lat": round(centroid_lat, 6),
                    "centroid_lon": round(centroid_lon, 6),
                    
                    # ======= AREA INFORMATION (CRITICAL FOR DISCREPANCY) =======
                    "computed_area_sqm": round(computed_area, 2),
                    "recorded_area_sqm": round(recorded_area, 2),
                    "area_difference_sqm": round(area_difference, 2),
                    "area_text": area_text,
                    "area_unit": "bigha-biswa",
                    
                    # ======= LAND CLASSIFICATION =======
                    "land_type": land_type["type"],
                    "land_type_hi": land_type["type_hi"],
                    "land_type_code": land_type["code"],
                    "soil_type": soil_type,
                    "soil_type_en": soil_type_en,
                    
                    # ======= OWNERSHIP DETAILS =======
                    "owner_name_hi": owner_hindi,
                    "owner_name_en": owner_english,
                    "father_name_hi": father_hindi,
                    "father_name_en": father_english,
                    "ownership_type": random.choice(["व्यक्तिगत", "संयुक्त", "सरकारी"]),
                    "ownership_share": f"{random.randint(1, 100)}%" if random.random() < 0.3 else "100%",
                    
                    # ======= AGRICULTURE DETAILS =======
                    "irrigation_type": irrigation_type,
                    "irrigation_type_en": irrigation_type_en,
                    "is_irrigated": is_irrigated,
                    "current_crop": current_crop,
                    "current_crop_en": current_crop_en,
                    "crop_season": random.choice(["रबी", "खरीफ", "जायद"]) if current_crop else None,
                    
                    # ======= VALUATION =======
                    "rate_per_sqm": rate_per_sqm,
                    "estimated_value_inr": estimated_value,
                    "circle_rate_year": 2024,
                    
                    # ======= DISCREPANCY INFORMATION =======
                    "has_discrepancy": has_discrepancy,
                    "discrepancy_type": "area_mismatch" if has_discrepancy else None,
                    "discrepancy_percentage": discrepancy_percentage if has_discrepancy else 0,
                    "discrepancy_severity": discrepancy_severity,
                    "record_status": "needs_review" if has_discrepancy else "verified",
                    "verification_status": "pending" if has_discrepancy else "completed",
                    
                    # ======= DOCUMENT SOURCE =======
                    "source_document": doc_source,
                    "source_page": str(doc_page),
                    "source_year": doc_year,
                    "survey_year": survey_year,
                    "acquisition_year": acquisition_year,
                    
                    # ======= MUTATION HISTORY =======
                    "mutation_count": num_mutations,
                    "last_mutation_year": mutations[-1]["year"] if mutations else None,
                    
                    # ======= METADATA =======
                    "record_version": 1,
                    "created_at": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat(),
                    "digitized_by": "System",
                    "remarks": "Auto-generated test data" if has_discrepancy else None,
                }
            }
            
            parcels.append(parcel)
            parcel_num += 1
    
    return parcels




def generate_all_geojson(parcels_per_village: int = 50, output_dir: str = None):
    """Generate GeoJSON files for all villages."""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "generated")
    
    os.makedirs(output_dir, exist_ok=True)
    
    all_parcels = []
    village_summaries = []
    
    print("Generating parcel data...")
    print("=" * 50)
    
    for village in VILLAGE_DATA:
        print(f"\n  * {village['name']} ({village['name_hi']})")
        parcels = generate_parcels_for_village(village, parcels_per_village)
        all_parcels.extend(parcels)
        
        discrepancy_count = sum(1 for p in parcels if p["properties"]["has_discrepancy"])
        print(f"     Generated: {len(parcels)} parcels")
        print(f"     Discrepancies: {discrepancy_count} ({discrepancy_count/len(parcels)*100:.1f}%)")
        
        village_summaries.append({
            "village_code": village["code"],
            "village_name": village["name"],
            "total_parcels": len(parcels),
            "discrepancies": discrepancy_count,
        })
        
        # Export individual village GeoJSON
        village_geojson = {
            "type": "FeatureCollection",
            "name": f"{village['name']}_Parcels",
            "crs": {
                "type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
            },
            "features": parcels
        }
        
        village_file = os.path.join(output_dir, f"{village['code']}_{village['name'].lower().replace(' ', '_')}_parcels.geojson")
        with open(village_file, "w", encoding="utf-8") as f:
            json.dump(village_geojson, f, ensure_ascii=False, indent=2)
    
    # Export combined GeoJSON
    combined_geojson = {
        "type": "FeatureCollection",
        "name": "Bhinay_Block_Parcels",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": all_parcels
    }
    
    combined_file = os.path.join(output_dir, "bhinay_all_parcels.geojson")
    with open(combined_file, "w", encoding="utf-8") as f:
        json.dump(combined_geojson, f, ensure_ascii=False, indent=2)
    
    # Export summary
    summary = {
        "generated_at": datetime.now().isoformat(),
        "total_parcels": len(all_parcels),
        "total_discrepancies": sum(v["discrepancies"] for v in village_summaries),
        "villages": village_summaries,
    }
    
    summary_file = os.path.join(output_dir, "generation_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 50)
    print(f"SUCCESS: Generated {len(all_parcels)} parcels across {len(VILLAGE_DATA)} villages")
    print(f"Output directory: {output_dir}")
    print(f"Combined file: bhinay_all_parcels.geojson")
    print(f"Summary: generation_summary.json")
    
    return combined_file


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate realistic land parcel GeoJSON data")
    parser.add_argument("--count", type=int, default=50,
                       help="Number of parcels per village (default: 50)")
    parser.add_argument("--output", type=str, default=None,
                       help="Output directory (default: data/generated)")
    
    args = parser.parse_args()
    
    generate_all_geojson(args.count, args.output)
