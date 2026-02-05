"""
Parcel model - Spatial representation of land parcels.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from ..database import Base


class Parcel(Base):
    """
    Represents a land parcel with spatial geometry.
    
    The geometry is stored as a Polygon in WGS84 (SRID 4326).
    Computed area is calculated from the geometry.
    """
    __tablename__ = "parcels"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(String(50), unique=True, nullable=False, index=True)
    village_code = Column(String(20), nullable=False, index=True)
    village_name = Column(String(100), nullable=True)
    
    # Spatial data (PostGIS)
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=False)
    centroid = Column(Geometry("POINT", srid=4326), nullable=True)
    
    # Computed from geometry
    computed_area_sqm = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for spatial queries
    __table_args__ = (
        Index('idx_parcel_geometry', 'geometry', postgresql_using='gist'),
        Index('idx_parcel_centroid', 'centroid', postgresql_using='gist'),
    )
    
    def __repr__(self):
        return f"<Parcel(plot_id={self.plot_id}, village={self.village_code})>"
    
    @property
    def geometry_shape(self):
        """Get Shapely geometry object."""
        if self.geometry:
            return to_shape(self.geometry)
        return None
    
    def to_geojson_feature(self) -> dict:
        """Convert parcel to GeoJSON Feature."""
        shape = self.geometry_shape
        return {
            "type": "Feature",
            "id": str(self.id),
            "geometry": shape.__geo_interface__ if shape else None,
            "properties": {
                "plot_id": self.plot_id,
                "village_code": self.village_code,
                "village_name": self.village_name,
                "computed_area_sqm": self.computed_area_sqm,
            }
        }
