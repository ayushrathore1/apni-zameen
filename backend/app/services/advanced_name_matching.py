"""
Advanced Name Matching Service for Hindi-English Land Records

Provides sophisticated name comparison algorithms that handle:
- Hindi to English transliteration variations
- Common spelling variations
- Title/honorific handling
- Father's name correlation
- Phonetic matching
"""
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
from Levenshtein import ratio as levenshtein_ratio
import re
import unicodedata


@dataclass
class NameMatch:
    """Result of a name comparison."""
    similarity_score: float  # 0-100
    match_type: str  # exact, phonetic, transliteration, partial
    confidence: str  # high, medium, low
    explanation_hindi: str
    explanation_english: str
    details: Dict


# Common Hindi honorifics and titles to strip
HINDI_TITLES = [
    'श्री', 'श्रीमती', 'कुमारी', 'डॉ', 'डॉ.', 'स्व.', 'स्वर्गीय',
    'बाबू', 'चौधरी', 'ठाकुर', 'राजा', 'पंडित', 'मौलवी'
]

ENGLISH_TITLES = [
    'shri', 'smt', 'kumari', 'dr', 'dr.', 'late', 'mr', 'mrs', 'ms',
    'babu', 'chaudhary', 'thakur', 'raja', 'pandit', 'maulvi'
]

# Common transliteration variations
TRANSLITERATION_MAP = {
    # Vowels
    'अ': ['a'], 'आ': ['a', 'aa'], 'इ': ['i'], 'ई': ['i', 'ee'],
    'उ': ['u'], 'ऊ': ['u', 'oo'], 'ए': ['e'], 'ऐ': ['ai', 'e'],
    'ओ': ['o'], 'औ': ['au', 'ou'],
    
    # Common consonants with variations
    'क': ['k', 'c'], 'ख': ['kh'], 'ग': ['g'], 'घ': ['gh'],
    'च': ['ch', 'c'], 'छ': ['chh', 'ch'], 'ज': ['j'], 'झ': ['jh'],
    'ट': ['t'], 'ठ': ['th'], 'ड': ['d'], 'ढ': ['dh'],
    'त': ['t'], 'थ': ['th'], 'द': ['d'], 'ध': ['dh'],
    'न': ['n'], 'प': ['p'], 'फ': ['ph', 'f'], 'ब': ['b'],
    'भ': ['bh'], 'म': ['m'], 'य': ['y'], 'र': ['r'],
    'ल': ['l'], 'व': ['v', 'w'], 'श': ['sh', 's'], 'ष': ['sh', 's'],
    'स': ['s'], 'ह': ['h'], 'क्ष': ['ksh', 'x'], 'त्र': ['tr'],
    'ज्ञ': ['gya', 'gn'],
}

# Common surname variations
SURNAME_VARIATIONS = {
    'sharma': ['sarma', 'sharmaji'],
    'verma': ['varma', 'vermaji'],
    'singh': ['sinh', 'singhji'],
    'yadav': ['jadav', 'yadavji'],
    'gupta': ['guptaji'],
    'mishra': ['misra', 'mishre'],
    'tripathi': ['trivedi', 'tripathiji'],
    'pandey': ['pande', 'pandeji'],
    'tiwari': ['tewari', 'tivari'],
    'dubey': ['dube', 'dwivedi'],
}


def normalize_hindi(name: str) -> str:
    """Normalize Hindi name by removing titles, diacritics, and extra spaces."""
    if not name:
        return ''
    
    # Remove titles
    words = name.split()
    words = [w for w in words if w not in HINDI_TITLES]
    name = ' '.join(words)
    
    # Normalize Unicode
    name = unicodedata.normalize('NFC', name)
    
    # Remove punctuation
    name = re.sub(r'[।,\.।॥\-/]', ' ', name)
    
    # Normalize spaces
    name = ' '.join(name.split())
    
    return name.strip()


def normalize_english(name: str) -> str:
    """Normalize English name by removing titles and standardizing format."""
    if not name:
        return ''
    
    # Lowercase
    name = name.lower().strip()
    
    # Remove titles
    words = name.split()
    words = [w for w in words if w not in ENGLISH_TITLES]
    name = ' '.join(words)
    
    # Remove punctuation except spaces
    name = re.sub(r'[^a-z\s]', '', name)
    
    # Normalize spaces
    name = ' '.join(name.split())
    
    return name.strip()


def generate_phonetic_key(name: str) -> str:
    """Generate a simple phonetic key for matching similar sounding names."""
    if not name:
        return ''
    
    name = name.lower()
    
    # Common phonetic substitutions
    replacements = [
        (r'ph', 'f'),
        (r'gh', 'g'),
        (r'kh', 'k'),
        (r'th', 't'),
        (r'dh', 'd'),
        (r'bh', 'b'),
        (r'chh', 'ch'),
        (r'sh', 's'),
        (r'ee', 'i'),
        (r'oo', 'u'),
        (r'aa', 'a'),
        (r'ai', 'e'),
        (r'au', 'o'),
        (r'y', 'i'),
        (r'w', 'v'),
    ]
    
    for pattern, replacement in replacements:
        name = re.sub(pattern, replacement, name)
    
    # Remove double letters
    name = re.sub(r'(.)\1+', r'\1', name)
    
    # Remove vowels except first
    if len(name) > 1:
        first_char = name[0]
        rest = re.sub(r'[aeiou]', '', name[1:])
        name = first_char + rest
    
    return name


def compare_names(
    name1_hindi: Optional[str],
    name1_english: Optional[str],
    name2_hindi: Optional[str],
    name2_english: Optional[str]
) -> NameMatch:
    """
    Compare two names that may be in Hindi and/or English.
    Returns a detailed match result with similarity score.
    """
    # Normalize all names
    h1 = normalize_hindi(name1_hindi or '')
    e1 = normalize_english(name1_english or '')
    h2 = normalize_hindi(name2_hindi or '')
    e2 = normalize_english(name2_english or '')
    
    best_score = 0.0
    match_type = 'none'
    details = {}
    
    # 1. Exact match check (highest priority)
    if h1 and h2 and h1 == h2:
        return NameMatch(
            similarity_score=100.0,
            match_type='exact_hindi',
            confidence='high',
            explanation_hindi='हिंदी नाम पूर्णतः मेल खाता है',
            explanation_english='Hindi names match exactly',
            details={'matched_value': h1}
        )
    
    if e1 and e2 and e1 == e2:
        return NameMatch(
            similarity_score=100.0,
            match_type='exact_english',
            confidence='high',
            explanation_hindi='अंग्रेजी नाम पूर्णतः मेल खाता है',
            explanation_english='English names match exactly',
            details={'matched_value': e1}
        )
    
    # 2. Hindi names Levenshtein similarity
    if h1 and h2:
        score = levenshtein_ratio(h1, h2) * 100
        if score > best_score:
            best_score = score
            match_type = 'hindi_fuzzy'
            details = {'hindi1': h1, 'hindi2': h2}
    
    # 3. English names Levenshtein similarity  
    if e1 and e2:
        score = levenshtein_ratio(e1, e2) * 100
        if score > best_score:
            best_score = score
            match_type = 'english_fuzzy'
            details = {'english1': e1, 'english2': e2}
    
    # 4. Phonetic matching
    if e1 and e2:
        phonetic1 = generate_phonetic_key(e1)
        phonetic2 = generate_phonetic_key(e2)
        phonetic_score = levenshtein_ratio(phonetic1, phonetic2) * 100
        
        if phonetic_score > best_score:
            best_score = phonetic_score
            match_type = 'phonetic'
            details = {'phonetic1': phonetic1, 'phonetic2': phonetic2}
    
    # 5. Cross-language comparison (Hindi vs English via phonetics)
    if h1 and e2:
        # This is a simplified check - in production, use proper transliteration
        h1_phonetic = generate_phonetic_key(h1)
        e2_phonetic = generate_phonetic_key(e2)
        cross_score = levenshtein_ratio(h1_phonetic, e2_phonetic) * 100
        if cross_score > best_score:
            best_score = cross_score
            match_type = 'cross_language'
            details = {'hindi': h1, 'english': e2}
    
    if h2 and e1:
        h2_phonetic = generate_phonetic_key(h2)
        e1_phonetic = generate_phonetic_key(e1)
        cross_score = levenshtein_ratio(h2_phonetic, e1_phonetic) * 100
        if cross_score > best_score:
            best_score = cross_score
            match_type = 'cross_language'
            details = {'hindi': h2, 'english': e1}
    
    # Determine confidence level
    if best_score >= 90:
        confidence = 'high'
    elif best_score >= 75:
        confidence = 'medium'
    else:
        confidence = 'low'
    
    # Generate explanations
    if best_score >= 85:
        explanation_hindi = f'नाम {best_score:.0f}% समान है (संभवतः वर्तनी भिन्नता)'
        explanation_english = f'Names are {best_score:.0f}% similar (likely spelling variation)'
    elif best_score >= 70:
        explanation_hindi = f'नाम {best_score:.0f}% समान है (संभावित मिलान)'
        explanation_english = f'Names are {best_score:.0f}% similar (possible match)'
    else:
        explanation_hindi = f'नाम में {100-best_score:.0f}% अंतर है'
        explanation_english = f'Names differ by {100-best_score:.0f}%'
    
    return NameMatch(
        similarity_score=best_score,
        match_type=match_type,
        confidence=confidence,
        explanation_hindi=explanation_hindi,
        explanation_english=explanation_english,
        details=details
    )


def find_similar_names(
    target_name: str,
    candidate_names: List[Tuple[str, str, any]],  # (hindi, english, id)
    threshold: float = 70.0,
    max_results: int = 10
) -> List[Tuple[any, NameMatch]]:
    """
    Find names similar to target from a list of candidates.
    Returns list of (id, NameMatch) tuples sorted by similarity.
    """
    results = []
    
    # Determine if target is Hindi or English
    is_hindi = bool(re.search(r'[\u0900-\u097F]', target_name))
    
    for hindi_name, english_name, item_id in candidate_names:
        if is_hindi:
            match = compare_names(target_name, None, hindi_name, english_name)
        else:
            match = compare_names(None, target_name, hindi_name, english_name)
        
        if match.similarity_score >= threshold:
            results.append((item_id, match))
    
    # Sort by similarity score descending
    results.sort(key=lambda x: x[1].similarity_score, reverse=True)
    
    return results[:max_results]


def check_father_name_correlation(
    owner_match: NameMatch,
    father1_hindi: Optional[str],
    father1_english: Optional[str],
    father2_hindi: Optional[str],
    father2_english: Optional[str]
) -> Tuple[float, str, str]:
    """
    Boost or reduce confidence based on father's name correlation.
    Returns (adjusted_score, explanation_hindi, explanation_english)
    """
    father_match = compare_names(father1_hindi, father1_english, father2_hindi, father2_english)
    
    base_score = owner_match.similarity_score
    
    if father_match.similarity_score >= 85:
        # Father names match - boost confidence
        adjusted = min(100, base_score + 10)
        return (
            adjusted,
            f'मालिक और पिता के नाम दोनों मेल खाते हैं',
            f'Both owner and father names match'
        )
    elif father_match.similarity_score >= 60:
        # Partial match
        return (
            base_score,
            f'मालिक का नाम मिलता है, पिता के नाम में कुछ अंतर',
            f'Owner name matches, father name partially differs'
        )
    else:
        # Father names don't match - reduce confidence
        adjusted = max(0, base_score - 15)
        return (
            adjusted,
            f'मालिक का नाम मिलता है लेकिन पिता का नाम अलग है',
            f'Owner name matches but father name differs'
        )
