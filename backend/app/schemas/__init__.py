"""
Pydantic schemas for API request/response validation.
"""
from .parcel import ParcelBase, ParcelCreate, ParcelResponse, ParcelGeoJSON
from .land_record import LandRecordBase, LandRecordCreate, LandRecordResponse
from .discrepancy import DiscrepancyBase, DiscrepancyResponse, DiscrepancyUpdate
from .search import SearchQuery, SearchResult

__all__ = [
    "ParcelBase", "ParcelCreate", "ParcelResponse", "ParcelGeoJSON",
    "LandRecordBase", "LandRecordCreate", "LandRecordResponse",
    "DiscrepancyBase", "DiscrepancyResponse", "DiscrepancyUpdate",
    "SearchQuery", "SearchResult"
]
