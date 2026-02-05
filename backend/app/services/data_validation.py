"""
Data Validation Service

Provides comprehensive validation for parcels and land records
before they are saved to the database.
"""
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import re
from shapely import wkt
from shapely.geometry import shape, Polygon
from shapely.validation import explain_validity


class ValidationSeverity(str, Enum):
    """Severity of validation issues."""
    ERROR = "error"      # Cannot save
    WARNING = "warning"  # Can save but needs attention
    INFO = "info"        # Informational


@dataclass
class ValidationIssue:
    """A single validation issue."""
    field: str
    message: str
    message_hindi: str
    severity: ValidationSeverity
    value: Optional[Any] = None


@dataclass
class ValidationResult:
    """Result of validation."""
    is_valid: bool
    issues: List[ValidationIssue]
    
    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == ValidationSeverity.ERROR]
    
    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == ValidationSeverity.WARNING]


# Plot ID patterns for different formats
PLOT_ID_PATTERNS = [
    r'^V\d{3}/\d+/\d+$',           # V001/1/123
    r'^\d+/\d+$',                   # 123/45
    r'^[A-Z]{2}\d{4}/\d+$',         # AB1234/567
]

# Valid village codes
VALID_VILLAGE_CODES = ['V001', 'V002', 'V003', 'V004', 'V005']


def validate_parcel(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate parcel data before saving.
    
    Checks:
    - Required fields presence
    - Plot ID format
    - Village code validity
    - Geometry validity
    - Area reasonableness
    """
    issues = []
    
    # Required fields
    if not data.get('plot_id'):
        issues.append(ValidationIssue(
            field='plot_id',
            message='Plot ID is required',
            message_hindi='प्लॉट आईडी आवश्यक है',
            severity=ValidationSeverity.ERROR
        ))
    else:
        # Validate plot ID format
        plot_id = data['plot_id']
        if not any(re.match(pattern, plot_id) for pattern in PLOT_ID_PATTERNS):
            issues.append(ValidationIssue(
                field='plot_id',
                message=f'Invalid plot ID format: {plot_id}',
                message_hindi=f'अमान्य प्लॉट आईडी प्रारूप: {plot_id}',
                severity=ValidationSeverity.WARNING,
                value=plot_id
            ))
    
    # Village code
    village_code = data.get('village_code')
    if not village_code:
        issues.append(ValidationIssue(
            field='village_code',
            message='Village code is required',
            message_hindi='ग्राम कोड आवश्यक है',
            severity=ValidationSeverity.ERROR
        ))
    elif village_code not in VALID_VILLAGE_CODES:
        issues.append(ValidationIssue(
            field='village_code',
            message=f'Unknown village code: {village_code}',
            message_hindi=f'अज्ञात ग्राम कोड: {village_code}',
            severity=ValidationSeverity.WARNING,
            value=village_code
        ))
    
    # Geometry validation
    geometry = data.get('geometry')
    if not geometry:
        issues.append(ValidationIssue(
            field='geometry',
            message='Geometry is required',
            message_hindi='ज्यामिति आवश्यक है',
            severity=ValidationSeverity.ERROR
        ))
    else:
        geom_issues = validate_geometry(geometry)
        issues.extend(geom_issues)
    
    # Area validation
    area = data.get('computed_area_sqm')
    if area is not None:
        if area <= 0:
            issues.append(ValidationIssue(
                field='computed_area_sqm',
                message='Area must be positive',
                message_hindi='क्षेत्रफल धनात्मक होना चाहिए',
                severity=ValidationSeverity.ERROR,
                value=area
            ))
        elif area < 10:
            issues.append(ValidationIssue(
                field='computed_area_sqm',
                message='Area seems unusually small',
                message_hindi='क्षेत्रफल असामान्य रूप से छोटा लगता है',
                severity=ValidationSeverity.WARNING,
                value=area
            ))
        elif area > 100000:
            issues.append(ValidationIssue(
                field='computed_area_sqm',
                message='Area seems unusually large (>10 hectares)',
                message_hindi='क्षेत्रफल असामान्य रूप से बड़ा लगता है (>10 हेक्टेयर)',
                severity=ValidationSeverity.WARNING,
                value=area
            ))
    
    return ValidationResult(
        is_valid=len([i for i in issues if i.severity == ValidationSeverity.ERROR]) == 0,
        issues=issues
    )


def validate_geometry(geometry: Dict) -> List[ValidationIssue]:
    """Validate GeoJSON geometry."""
    issues = []
    
    try:
        geom = shape(geometry)
        
        # Check if valid
        if not geom.is_valid:
            reason = explain_validity(geom)
            issues.append(ValidationIssue(
                field='geometry',
                message=f'Invalid geometry: {reason}',
                message_hindi=f'अमान्य ज्यामिति: {reason}',
                severity=ValidationSeverity.ERROR
            ))
        
        # Check if polygon
        if geometry.get('type') != 'Polygon':
            issues.append(ValidationIssue(
                field='geometry',
                message='Geometry must be a Polygon',
                message_hindi='ज्यामिति पॉलीगॉन होनी चाहिए',
                severity=ValidationSeverity.ERROR
            ))
        
        # Check bounds (should be in India roughly)
        bounds = geom.bounds
        if bounds:
            min_lon, min_lat, max_lon, max_lat = bounds
            if not (68 <= min_lon <= 98 and 68 <= max_lon <= 98):
                issues.append(ValidationIssue(
                    field='geometry',
                    message='Longitude out of expected India bounds',
                    message_hindi='देशांतर भारत की अपेक्षित सीमा से बाहर',
                    severity=ValidationSeverity.WARNING
                ))
            if not (6 <= min_lat <= 38 and 6 <= max_lat <= 38):
                issues.append(ValidationIssue(
                    field='geometry',
                    message='Latitude out of expected India bounds',
                    message_hindi='अक्षांश भारत की अपेक्षित सीमा से बाहर',
                    severity=ValidationSeverity.WARNING
                ))
        
    except Exception as e:
        issues.append(ValidationIssue(
            field='geometry',
            message=f'Geometry parsing error: {str(e)}',
            message_hindi=f'ज्यामिति पार्सिंग त्रुटि: {str(e)}',
            severity=ValidationSeverity.ERROR
        ))
    
    return issues


def validate_land_record(data: Dict[str, Any]) -> ValidationResult:
    """
    Validate land record data before saving.
    
    Checks:
    - Required fields
    - Owner name presence
    - Area consistency
    - Record type validity
    """
    issues = []
    
    # Plot ID
    if not data.get('plot_id'):
        issues.append(ValidationIssue(
            field='plot_id',
            message='Plot ID is required',
            message_hindi='प्लॉट आईडी आवश्यक है',
            severity=ValidationSeverity.ERROR
        ))
    
    # Owner name (at least one)
    if not data.get('owner_name_hindi') and not data.get('owner_name_english'):
        issues.append(ValidationIssue(
            field='owner_name',
            message='At least one owner name (Hindi or English) is required',
            message_hindi='कम से कम एक मालिक का नाम (हिंदी या अंग्रेजी) आवश्यक है',
            severity=ValidationSeverity.ERROR
        ))
    
    # Validate Hindi name contains Devanagari
    hindi_name = data.get('owner_name_hindi')
    if hindi_name and not re.search(r'[\u0900-\u097F]', hindi_name):
        issues.append(ValidationIssue(
            field='owner_name_hindi',
            message='Hindi name should contain Devanagari characters',
            message_hindi='हिंदी नाम में देवनागरी अक्षर होने चाहिए',
            severity=ValidationSeverity.WARNING,
            value=hindi_name
        ))
    
    # Area
    area = data.get('recorded_area_sqm')
    if area is not None:
        if area <= 0:
            issues.append(ValidationIssue(
                field='recorded_area_sqm',
                message='Recorded area must be positive',
                message_hindi='दर्ज क्षेत्रफल धनात्मक होना चाहिए',
                severity=ValidationSeverity.ERROR,
                value=area
            ))
    
    # Record type
    valid_types = ['खतौनी', 'खसरा', 'पट्टा', 'बैनामा', 'other']
    record_type = data.get('record_type')
    if record_type and record_type not in valid_types:
        issues.append(ValidationIssue(
            field='record_type',
            message=f'Unknown record type: {record_type}',
            message_hindi=f'अज्ञात रिकॉर्ड प्रकार: {record_type}',
            severity=ValidationSeverity.WARNING,
            value=record_type
        ))
    
    return ValidationResult(
        is_valid=len([i for i in issues if i.severity == ValidationSeverity.ERROR]) == 0,
        issues=issues
    )


def format_validation_errors(result: ValidationResult) -> Dict:
    """Format validation result for API response."""
    return {
        'is_valid': result.is_valid,
        'error_count': len(result.errors),
        'warning_count': len(result.warnings),
        'issues': [
            {
                'field': issue.field,
                'message': issue.message,
                'message_hindi': issue.message_hindi,
                'severity': issue.severity.value,
                'value': issue.value
            }
            for issue in result.issues
        ]
    }
