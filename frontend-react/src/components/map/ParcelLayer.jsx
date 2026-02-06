import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { PARCEL_COLORS } from '@/lib/constants'
import { getAreaDiscrepancy, getDiscrepancyColor } from '@/lib/areaUtils'

// Get parcel status based on discrepancy data
function getParcelStatus(properties, geometry) {
  if (!properties) return 'default'
  
  // Check for explicitly marked discrepancies
  const hasDiscrepancy = properties.has_discrepancy
  const discrepancySeverity = properties.discrepancy_severity
  const recordStatus = properties.record_status
  
  if (hasDiscrepancy) {
    if (discrepancySeverity === 'high' || discrepancySeverity === 'critical') {
      return 'critical'
    }
    return 'needs_review'
  }
  
  // Check for resolved/verified status
  if (properties.discrepancy_status === 'resolved' || recordStatus === 'verified') {
    return 'matched'
  }
  
  // Check severity from API
  if (properties.severity === 'critical') {
    return 'critical'
  }
  if (properties.severity === 'major' || properties.severity === 'minor') {
    return 'needs_review'
  }
  
  // Default status
  return 'matched'
}

// Get color based on parcel status and area discrepancy
function getParcelColor(status, isHovered, isSelected, discrepancy) {
  if (isSelected) return PARCEL_COLORS.selected
  if (isHovered) return PARCEL_COLORS.hover
  
  // Use discrepancy-based colors if available
  if (discrepancy && discrepancy.severity && discrepancy.severity !== 'none') {
    const colors = getDiscrepancyColor(discrepancy.severity)
    return colors.fill
  }
  
  return PARCEL_COLORS[status] || PARCEL_COLORS.default
}

export function ParcelLayer({
  parcels,
  selectedParcel,
  hoveredParcel,
  onParcelClick,
  onParcelHover,
  onParcelLeave,
}) {
  // Convert parcels to GeoJSON FeatureCollection
  const geoJsonData = useMemo(() => {
    if (!parcels || parcels.length === 0) return null
    
    // If parcels is already a FeatureCollection, use it directly
    if (parcels.type === 'FeatureCollection') {
      return parcels
    }
    
    // If it's an array of features or parcels, wrap it
    const features = Array.isArray(parcels) ? parcels : [parcels]
    
    return {
      type: 'FeatureCollection',
      features: features.filter(f => f && (f.geometry || f.type === 'Feature')),
    }
  }, [parcels])

  // Style function for each feature with area discrepancy visualization
  const styleFeature = (feature) => {
    const status = getParcelStatus(feature.properties, feature.geometry)
    const isHovered = hoveredParcel?.id === feature.id || 
                      hoveredParcel?.properties?.plot_id === feature.properties?.plot_id
    const isSelected = selectedParcel?.id === feature.id ||
                       selectedParcel?.properties?.plot_id === feature.properties?.plot_id

    // Calculate area discrepancy for enhanced styling
    const discrepancy = getAreaDiscrepancy(
      feature.properties?.computed_area_sqm,
      feature.properties?.recorded_area_sqm
    )
    
    const color = getParcelColor(status, isHovered, isSelected, discrepancy)
    
    // Use dashed pattern for critical discrepancies, dotted for major
    let dashArray = null
    if (!isSelected && !isHovered) {
      if (discrepancy.severity === 'critical') {
        dashArray = '8, 4'
      } else if (discrepancy.severity === 'major') {
        dashArray = '4, 3'
      }
    }

    return {
      fillColor: color,
      fillOpacity: isSelected ? 0.6 : isHovered ? 0.5 : 0.35,
      color: isSelected ? PARCEL_COLORS.selected : isHovered ? PARCEL_COLORS.hover : '#1f2937',
      weight: isSelected ? 3 : isHovered ? 2 : 1,
      opacity: 1,
      dashArray: dashArray,
    }
  }

  // Event handlers for each feature
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        e.originalEvent.stopPropagation()
        onParcelClick?.(feature)
      },
      mouseover: () => {
        onParcelHover?.(feature)
        layer.setStyle({
          fillOpacity: 0.5,
          weight: 2,
        })
      },
      mouseout: () => {
        onParcelLeave?.()
        layer.setStyle(styleFeature(feature))
      },
    })

    // Add tooltip with detailed info including area discrepancy
    if (feature.properties?.plot_id) {
      const props = feature.properties
      const ownerName = props.owner_name_hindi || props.owner_name_english || 'N/A'
      const computedArea = props.computed_area_sqm
      const recordedArea = props.recorded_area_sqm
      
      // Calculate discrepancy for tooltip
      const discrepancy = getAreaDiscrepancy(computedArea, recordedArea)
      
      // Build tooltip HTML
      let tooltipHtml = `<strong>Plot: ${props.plot_id}</strong><br/>`
      tooltipHtml += `<span>Owner: ${ownerName}</span><br/>`
      tooltipHtml += `<span>${props.village_name || ''}</span>`
      
      if (computedArea && recordedArea) {
        const diff = Math.abs(discrepancy.difference).toFixed(0)
        const percentage = Math.abs(discrepancy.percentageDifference).toFixed(1)
        
        const color = discrepancy.severity === 'critical' ? '#DC2626' : 
                      discrepancy.severity === 'major' ? '#D97706' : '#16A34A'
        
        tooltipHtml += `<br/><span style="color: ${color}; font-weight: bold;">`
        
        if (discrepancy.severity === 'critical') {
          tooltipHtml += `⚠ Critical: ${percentage}% difference (${diff} m²)`
        } else if (discrepancy.severity === 'major') {
          tooltipHtml += `● Variance: ${percentage}% difference (${diff} m²)`
        } else if (discrepancy.hasDiscrepancy) {
          tooltipHtml += `• Minor: ${percentage}% difference (${diff} m²)`
        } else {
          tooltipHtml += `✓ Area Matched`
        }
        
        tooltipHtml += `</span>`
      }
      
      layer.bindTooltip(tooltipHtml, {
        permanent: false,
        direction: 'top',
        className: 'parcel-tooltip',
      })
    }

  }

  if (!geoJsonData || geoJsonData.features.length === 0) {
    return null
  }

  return (
    <GeoJSON
      key={JSON.stringify(geoJsonData.features.map(f => f.properties?.plot_id))}
      data={geoJsonData}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  )
}
