import * as turf from '@turf/turf'

/**
 * Calculate the area of a GeoJSON polygon in square meters
 */
export function calculatePolygonArea(geometry) {
  if (!geometry || geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return null
  }
  
  try {
    const feature = {
      type: 'Feature',
      geometry: geometry,
      properties: {}
    }
    
    // area returns square meters
    const areaInSqm = turf.area(feature)
    return areaInSqm
  } catch (error) {
    console.error('Error calculating polygon area:', error)
    return null
  }
}

/**
 * Get area discrepancy information
 */
export function getAreaDiscrepancy(computedArea, recordedArea) {
  if (!computedArea || !recordedArea) {
    return {
      hasDiscrepancy: false,
      difference: 0,
      percentageDifference: 0,
      severity: null,
      status: 'unknown',
    }
  }
  
  const difference = computedArea - recordedArea
  const percentageDifference = (difference / recordedArea) * 100
  const absolutePercentage = Math.abs(percentageDifference)
  
  // Determine severity based on percentage difference
  let severity = 'none'
  let status = 'matched'
  
  if (absolutePercentage > 15) {
    severity = 'critical'
    status = 'critical'
  } else if (absolutePercentage > 10) {
    severity = 'major'
    status = 'needs_review'
  } else if (absolutePercentage > 5) {
    severity = 'minor'
    status = 'needs_review'
  }
  
  return {
    hasDiscrepancy: absolutePercentage > 5,
    difference,
    percentageDifference: parseFloat(percentageDifference.toFixed(2)),
    absolutePercentage: parseFloat(absolutePercentage.toFixed(2)),
    severity,
    status,
    isUnderRecorded: difference < 0,
    isOverRecorded: difference > 0,
  }
}

/**
 * Get color based on area discrepancy severity
 */
export function getDiscrepancyColor(severity, opacity = 1) {
  const colors = {
    critical: { fill: '#EF4444', border: '#DC2626', opacity: 0.6 }, // Red
    major: { fill: '#F59E0B', border: '#D97706', opacity: 0.5 },    // Amber
    minor: { fill: '#FBBF24', border: '#F59E0B', opacity: 0.5 },    // Light amber
    none: { fill: '#22C55E', border: '#16A34A', opacity: 0.35 },    // Green
  }
  
  return colors[severity] || colors.none
}

/**
 * Get status badge label and variant
 */
export function getStatusBadge(discrepancy) {
  if (discrepancy.severity === 'critical') {
    return {
      label: 'Critical Discrepancy',
      variant: 'destructive',
      icon: 'alert-triangle',
    }
  }
  
  if (discrepancy.severity === 'major') {
    return {
      label: 'Major Discrepancy',
      variant: 'warning',
      icon: 'alert-circle',
    }
  }
  
  if (discrepancy.severity === 'minor') {
    return {
      label: 'Minor Variance',
      variant: 'secondary',
      icon: 'info',
    }
  }
  
  return {
    label: 'Area Matched',
    variant: 'success',
    icon: 'check-circle',
  }
}

/**
 * Get descriptive text for area discrepancy
 */
export function getDiscrepancyDescription(discrepancy) {
  if (!discrepancy.hasDiscrepancy) {
    return 'Area computed from map boundaries matches recorded area within acceptable tolerance.'
  }
  
  const direction = discrepancy.isUnderRecorded ? 'understated' : 'overstated'
  const percentage = Math.abs(discrepancy.percentageDifference).toFixed(1)
  
  if (discrepancy.severity === 'critical') {
    return `Critical discrepancy detected: Recorded area is ${percentage}% ${direction} compared to map boundaries. Immediate verification required.`
  }
  
  if (discrepancy.severity === 'major') {
    return `Significant variance: Recorded area is ${percentage}% ${direction} compared to map boundaries. Review recommended.`
  }
  
  return `Minor variance: Recorded area is ${percentage}% ${direction} compared to map boundaries.`
}

/**
 * Format area measurement for display
 */
export function formatAreaValue(areaSqm, precision = 2) {
  if (!areaSqm) return 'N/A'
  
  if (areaSqm >= 10000) {
    const hectares = areaSqm / 10000
    return `${hectares.toFixed(precision)} हेक्टेयर`
  }
  
  return `${areaSqm.toFixed(precision)} वर्ग मीटर`
}

/**
 * Get all area stats for a parcel
 */
export function getParcelAreaStats(parcel) {
  const props = parcel.properties || parcel
  const computedArea = calculatePolygonArea(parcel.geometry)
  const recordedArea = props.recorded_area_sqm || props.area
  
  const discrepancy = getAreaDiscrepancy(computedArea, recordedArea)
  
  return {
    computed: computedArea,
    recorded: recordedArea,
    discrepancy,
    badge: getStatusBadge(discrepancy),
    description: getDiscrepancyDescription(discrepancy),
    color: getDiscrepancyColor(discrepancy.severity),
  }
}
