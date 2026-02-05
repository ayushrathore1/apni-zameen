"""
Services package - Business logic layer.
"""
from .discrepancy_engine import DiscrepancyEngine
from .name_similarity import calculate_name_similarity, normalize_search_query
from .area_tolerance import compare_areas, classify_severity
from .advanced_name_matching import compare_names, NameMatch, find_similar_names
from .severity_scoring import compute_severity_score, SeverityScore
from .enhanced_discrepancy_engine import EnhancedDiscrepancyEngine

__all__ = [
    "DiscrepancyEngine",
    "EnhancedDiscrepancyEngine",
    "calculate_name_similarity",
    "normalize_search_query", 
    "compare_areas",
    "classify_severity",
    "compare_names",
    "NameMatch",
    "find_similar_names",
    "compute_severity_score",
    "SeverityScore"
]

