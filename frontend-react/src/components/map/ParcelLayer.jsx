import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { PARCEL_COLORS } from '@/lib/constants'

// Get parcel status based on discrepancy data
function getParcelStatus(properties) {
  if (!properties) return 'default'
  
  // Check for discrepancy flags from generated data
  const hasDiscrepancy = properties.has_discrepancy
  const discrepancySeverity = properties.discrepancy_severity
  const recordStatus = properties.record_status
  
  // If explicitly marked as having discrepancy
  if (hasDiscrepancy) {
    // High severity = Critical (red), Medium = Needs Review (orange)
    if (discrepancySeverity === 'high') {
      return 'critical'
    }
    return 'needs_review'
  }
  
  // Check for legacy discrepancy_status field
  if (properties.discrepancy_status === 'resolved' || recordStatus === 'verified') {
    return 'matched'
  }
  
  // Check severity field from API
  if (properties.severity === 'critical') {
    return 'critical'
  }
  if (properties.severity === 'major' || properties.severity === 'minor') {
    return 'needs_review'
  }
  
  // Default to matched (green) for parcels without issues
  return 'matched'
}


// Get color based on parcel status
function getParcelColor(status, isHovered, isSelected) {
  if (isSelected) return PARCEL_COLORS.selected
  if (isHovered) return PARCEL_COLORS.hover
  
  return PARCEL_COLORS[status] || PARCEL_COLORS.default
}

export function ParcelLayer({
  parcels,
  selectedParcel,
  hoveredParcel,
  highlightedParcelId,
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

  // Style function for each feature
  const styleFeature = (feature) => {
    const status = getParcelStatus(feature.properties)
    const plotId = feature.properties?.plot_id
    const isHighlighted = highlightedParcelId && plotId === highlightedParcelId
    const isHovered = hoveredParcel?.id === feature.id || 
                      hoveredParcel?.properties?.plot_id === plotId
    const isSelected = selectedParcel?.id === feature.id ||
                       selectedParcel?.properties?.plot_id === plotId

    // Highlighted parcel from search gets distinctive styling
    if (isHighlighted) {
      return {
        fillColor: '#00D4FF',
        fillOpacity: 0.4,
        color: '#00D4FF',
        weight: 4,
        opacity: 1,
        dashArray: null,
        className: 'highlighted-parcel-pulse',
      }
    }

    return {
      fillColor: getParcelColor(status, isHovered, isSelected),
      fillOpacity: isSelected ? 0.6 : isHovered ? 0.5 : 0.35,
      color: isSelected ? PARCEL_COLORS.selected : isHovered ? PARCEL_COLORS.hover : '#1f2937',
      weight: isSelected ? 3 : isHovered ? 2 : 1,
      opacity: 1,
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

    // Add tooltip with detailed info
    if (feature.properties?.plot_id) {
      const props = feature.properties
      const hasDiscrepancy = props.has_discrepancy
      const ownerName = props.owner_name_hi || props.owner_name_en || 'N/A'
      
      // Build tooltip HTML
      let tooltipHtml = `<strong>Plot: ${props.plot_id}</strong><br/>`
      tooltipHtml += `<span>Owner: ${ownerName}</span><br/>`
      tooltipHtml += `<span>${props.village_name || ''}</span>`
      
      if (hasDiscrepancy) {
        const diff = Math.abs(props.area_difference_sqm || 0).toFixed(0)
        tooltipHtml += `<br/><span style="color: #EF4444; font-weight: bold;">⚠ Area Mismatch: ${diff} m²</span>`
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
