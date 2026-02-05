"""
Name similarity service for Hindi/English name matching.
Handles transliteration, normalization, and fuzzy matching.
"""
import re
from typing import List, Tuple, Optional

# Try to import Levenshtein, fall back to simple implementation
try:
    from Levenshtein import ratio as levenshtein_ratio
except ImportError:
    def levenshtein_ratio(s1: str, s2: str) -> float:
        """Simple Levenshtein ratio fallback."""
        if not s1 or not s2:
            return 0.0
        if s1 == s2:
            return 1.0
        
        len1, len2 = len(s1), len(s2)
        if len1 < len2:
            s1, s2 = s2, s1
            len1, len2 = len2, len1
        
        current_row = list(range(len2 + 1))
        for i in range(1, len1 + 1):
            previous_row, current_row = current_row, [i] + [0] * len2
            for j in range(1, len2 + 1):
                add, delete, change = previous_row[j] + 1, current_row[j-1] + 1, previous_row[j-1]
                if s1[i-1] != s2[j-1]:
                    change += 1
                current_row[j] = min(add, delete, change)
        
        distance = current_row[len2]
        max_len = max(len1, len2)
        return (max_len - distance) / max_len if max_len > 0 else 0.0


# Common Hindi name variations and normalization patterns
HINDI_NORMALIZATIONS = {
    'श्री': '',
    'श्रीमती': '',
    'श्रीमति': '',
    'कुमारी': '',
    'सुश्री': '',
    'स्व.': '',
    'स्वर्गीय': '',
    'मृतक': '',
    'पुत्र': ' पुत्र ',
    'पुत्री': ' पुत्री ',
    'पत्नी': ' पत्नी ',
    'विधवा': ' विधवा ',
}

# Common English name prefixes to remove
ENGLISH_PREFIXES = ['shri', 'smt', 'mr', 'mrs', 'ms', 'miss', 'late', 'dr', 'prof']


def normalize_hindi_name(name: str) -> str:
    """
    Normalize a Hindi name by removing honorifics and standardizing format.
    """
    if not name:
        return ""
    
    normalized = name.strip()
    
    # Remove common prefixes
    for prefix, replacement in HINDI_NORMALIZATIONS.items():
        normalized = normalized.replace(prefix, replacement)
    
    # Remove extra whitespace
    normalized = ' '.join(normalized.split())
    
    return normalized


def normalize_english_name(name: str) -> str:
    """
    Normalize an English name by removing prefixes and standardizing case.
    """
    if not name:
        return ""
    
    normalized = name.strip().lower()
    
    # Remove common prefixes
    for prefix in ENGLISH_PREFIXES:
        if normalized.startswith(prefix + ' '):
            normalized = normalized[len(prefix) + 1:]
        if normalized.startswith(prefix + '.'):
            normalized = normalized[len(prefix) + 1:]
    
    # Remove extra whitespace and normalize
    normalized = ' '.join(normalized.split())
    
    return normalized


def normalize_search_query(query: str) -> str:
    """
    Normalize a search query for database searching.
    Handles both Hindi and English queries.
    """
    if not query:
        return ""
    
    # Basic normalization
    normalized = query.strip()
    
    # Check if primarily Hindi (contains Devanagari characters)
    if any('\u0900' <= c <= '\u097F' for c in normalized):
        normalized = normalize_hindi_name(normalized)
    else:
        normalized = normalize_english_name(normalized)
    
    return normalized


def calculate_name_similarity(name1: str, name2: str, language: str = "auto") -> float:
    """
    Calculate similarity score between two names (0-100).
    
    Args:
        name1: First name
        name2: Second name
        language: "hindi", "english", or "auto" (detect automatically)
    
    Returns:
        Similarity score from 0 to 100
    """
    if not name1 or not name2:
        return 0.0
    
    # Detect language if auto
    if language == "auto":
        is_hindi = any('\u0900' <= c <= '\u097F' for c in name1 + name2)
        language = "hindi" if is_hindi else "english"
    
    # Normalize names
    if language == "hindi":
        norm1 = normalize_hindi_name(name1)
        norm2 = normalize_hindi_name(name2)
    else:
        norm1 = normalize_english_name(name1)
        norm2 = normalize_english_name(name2)
    
    # Calculate Levenshtein ratio
    ratio = levenshtein_ratio(norm1, norm2)
    
    return ratio * 100


def find_similar_names(
    target: str, 
    candidates: List[str], 
    threshold: float = 70.0
) -> List[Tuple[str, float]]:
    """
    Find names similar to target from a list of candidates.
    
    Args:
        target: Name to match against
        candidates: List of candidate names
        threshold: Minimum similarity score (0-100)
    
    Returns:
        List of (name, score) tuples sorted by score descending
    """
    results = []
    
    for candidate in candidates:
        score = calculate_name_similarity(target, candidate)
        if score >= threshold:
            results.append((candidate, score))
    
    return sorted(results, key=lambda x: x[1], reverse=True)


def names_match(name1: str, name2: str, threshold: float = 80.0) -> bool:
    """
    Check if two names match within threshold.
    
    Args:
        name1: First name
        name2: Second name  
        threshold: Minimum similarity score to consider a match
    
    Returns:
        True if names match
    """
    return calculate_name_similarity(name1, name2) >= threshold


def explain_name_difference(name1: str, name2: str) -> str:
    """
    Generate a human-readable explanation of name differences.
    """
    score = calculate_name_similarity(name1, name2)
    
    if score >= 95:
        return "Names are nearly identical (minor spelling variation)"
    elif score >= 80:
        return "Names are similar (likely same person with different spelling)"
    elif score >= 60:
        return "Names have some similarity (possible match but needs verification)"
    else:
        return "Names are significantly different (likely different individuals)"
