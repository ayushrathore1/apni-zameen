"""
Pydantic schemas for Search API.
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from uuid import UUID


class SearchQuery(BaseModel):
    """Search query parameters."""
    q: str = Field(..., min_length=1, description="Search query string")
    village_code: Optional[str] = Field(None, description="Filter by village")
    limit: int = Field(20, ge=1, le=100, description="Max results")


class SearchResultItem(BaseModel):
    """Single search result."""
    type: str = Field(..., description="Result type: parcel or record")
    id: UUID
    plot_id: str
    village_code: Optional[str] = None
    village_name: Optional[str] = None
    
    # For parcel results
    computed_area_sqm: Optional[float] = None
    centroid_lon: Optional[float] = None
    centroid_lat: Optional[float] = None
    
    # For record results
    owner_name_hindi: Optional[str] = None
    owner_name_english: Optional[str] = None
    
    # Match info
    match_score: Optional[float] = Field(None, description="Relevance score 0-100")
    match_field: Optional[str] = Field(None, description="Field that matched")


class SearchResult(BaseModel):
    """Search results response."""
    query: str
    total: int
    results: List[SearchResultItem]


class AutocompleteResult(BaseModel):
    """Autocomplete suggestion."""
    text: str
    type: str  # plot_id, owner_name
    plot_id: Optional[str] = None
