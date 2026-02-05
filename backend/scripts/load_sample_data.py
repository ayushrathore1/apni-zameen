"""
Load sample data into the database.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.generate_synthetic_data import generate_sample_data, export_geojson


def main():
    print("Loading sample data...")
    generate_sample_data(100)  # 100 parcels per village = 500 total
    export_geojson()
    print("\n✓ Sample data loaded successfully!")


if __name__ == "__main__":
    main()
