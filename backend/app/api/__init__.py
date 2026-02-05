"""
API routes package.
"""
from .parcels import router as parcels_router
from .records import router as records_router
from .discrepancies import router as discrepancies_router
from .search import router as search_router

__all__ = [
    "parcels_router",
    "records_router", 
    "discrepancies_router",
    "search_router"
]
