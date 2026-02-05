"""
Database initialization script.
Creates all tables and optionally loads sample data.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base, init_db
from app.models import Parcel, LandRecord, Discrepancy, ChangeLog


def main():
    """Initialize database tables."""
    print("Initializing database...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("✓ Database tables created successfully!")
    print("\nTables created:")
    for table in Base.metadata.tables:
        print(f"  - {table}")


if __name__ == "__main__":
    main()
