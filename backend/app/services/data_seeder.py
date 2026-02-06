"""
Data Seeder Service for inserting parsed data into the database.
Handles deduplication and linking of parcels and land records.
"""
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2 import WKTElement
from shapely.geometry import shape

from ..models.parcel import Parcel
from ..models.land_record import LandRecord


class DataSeeder:
    """
    Service for seeding parsed data into the database.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _geometry_to_wkt(self, geom_dict: Dict) -> str:
        """Convert GeoJSON geometry to WKT."""
        geom = shape(geom_dict)
        return geom.wkt
    
    def _calculate_area_sqm(self, geom_dict: Dict) -> float:
        """Calculate area in square meters from geometry."""
        geom = shape(geom_dict)
        # Approximate conversion (for accurate area, use a projected CRS)
        # Using centroid latitude for rough conversion
        centroid = geom.centroid
        lat = centroid.y
        # Degrees to meters conversion factor at given latitude
        lat_factor = 111320  # meters per degree latitude
        lon_factor = 111320 * abs(lat)  # varies with latitude
        
        # Scale geometry to approximate meters
        # This is a rough approximation; for production use pyproj
        area_deg = geom.area
        area_sqm = area_deg * lat_factor * lon_factor
        return area_sqm
    
    def seed_parcels(self, parcels: List[Dict[str, Any]]) -> int:
        """
        Seed parcel geometries into the database.
        
        Args:
            parcels: List of parcel dicts with plot_id, geometry, etc.
            
        Returns:
            Number of parcels seeded
        """
        seeded_count = 0
        
        for parcel_data in parcels:
            plot_id = parcel_data.get('plot_id')
            if not plot_id:
                continue
            
            # Check for existing parcel
            existing = self.db.query(Parcel).filter(Parcel.plot_id == plot_id).first()
            
            geom_dict = parcel_data.get('geometry')
            if not geom_dict:
                continue
            
            wkt = self._geometry_to_wkt(geom_dict)
            geom_wkt = WKTElement(wkt, srid=4326)
            
            # Calculate centroid
            geom_shape = shape(geom_dict)
            centroid = geom_shape.centroid
            centroid_wkt = WKTElement(f'POINT({centroid.x} {centroid.y})', srid=4326)
            
            # Calculate area
            area_sqm = self._calculate_area_sqm(geom_dict)
            
            if existing:
                # Update existing parcel
                existing.geometry = geom_wkt
                existing.centroid = centroid_wkt
                existing.computed_area_sqm = area_sqm
                existing.village_code = parcel_data.get('village_code') or existing.village_code
                existing.village_name = parcel_data.get('village_name') or existing.village_name
                existing.updated_at = datetime.utcnow()
            else:
                # Create new parcel
                new_parcel = Parcel(
                    plot_id=plot_id,
                    village_code=parcel_data.get('village_code', 'UNKNOWN'),
                    village_name=parcel_data.get('village_name'),
                    geometry=geom_wkt,
                    centroid=centroid_wkt,
                    computed_area_sqm=area_sqm,
                )
                self.db.add(new_parcel)
                seeded_count += 1
        
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
        
        return seeded_count
    
    def seed_land_records(self, records: List[Dict[str, Any]]) -> int:
        """
        Seed land records into the database.
        
        Args:
            records: List of record dicts with plot_id, owner_name_hindi, etc.
            
        Returns:
            Number of records seeded
        """
        seeded_count = 0
        
        for record_data in records:
            plot_id = record_data.get('plot_id')
            owner_name = record_data.get('owner_name_hindi')
            
            if not plot_id or not owner_name:
                continue
            
            # Find linked parcel
            parcel = self.db.query(Parcel).filter(Parcel.plot_id == plot_id).first()
            parcel_id = parcel.id if parcel else None
            
            # Check for existing current record with same plot_id
            existing = self.db.query(LandRecord).filter(
                LandRecord.plot_id == plot_id,
                LandRecord.is_current == True
            ).first()
            
            if existing:
                # Create new version, mark old as not current
                existing.is_current = False
                
                new_record = LandRecord(
                    plot_id=plot_id,
                    parcel_id=parcel_id,
                    owner_name_hindi=owner_name,
                    owner_name_english=record_data.get('owner_name_english'),
                    father_name_hindi=record_data.get('father_name_hindi'),
                    father_name_english=record_data.get('father_name_english'),
                    recorded_area_sqm=record_data.get('recorded_area_sqm'),
                    recorded_area_text=record_data.get('recorded_area_text'),
                    khata_number=record_data.get('khata_number'),
                    khatauni_number=record_data.get('khatauni_number'),
                    source_document=record_data.get('source_document'),
                    version=existing.version + 1,
                    previous_version_id=existing.id,
                    is_current=True,
                )
                self.db.add(new_record)
            else:
                # Create new record
                new_record = LandRecord(
                    plot_id=plot_id,
                    parcel_id=parcel_id,
                    owner_name_hindi=owner_name,
                    owner_name_english=record_data.get('owner_name_english'),
                    father_name_hindi=record_data.get('father_name_hindi'),
                    father_name_english=record_data.get('father_name_english'),
                    recorded_area_sqm=record_data.get('recorded_area_sqm'),
                    recorded_area_text=record_data.get('recorded_area_text'),
                    khata_number=record_data.get('khata_number'),
                    khatauni_number=record_data.get('khatauni_number'),
                    source_document=record_data.get('source_document'),
                    version=1,
                    is_current=True,
                )
                self.db.add(new_record)
            
            seeded_count += 1
        
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
        
        return seeded_count
