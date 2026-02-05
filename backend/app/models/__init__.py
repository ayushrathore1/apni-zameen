"""
SQLAlchemy models for Land Record Digitization.
"""
from .parcel import Parcel
from .land_record import LandRecord
from .discrepancy import Discrepancy, DiscrepancyType, Severity, DiscrepancyStatus
from .change_log import ChangeLog, ActionType
from .user import User, UserRole

__all__ = [
    "Parcel",
    "LandRecord", 
    "Discrepancy",
    "DiscrepancyType",
    "Severity",
    "DiscrepancyStatus",
    "ChangeLog",
    "ActionType",
    "User",
    "UserRole",
]

