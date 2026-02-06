import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { PARCEL_COLORS } from '@/lib/constants'
// import { getAreaDiscrepancy, getDiscrepancyColor } from '@/lib/areaUtils'

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
    const status = getParcelStatus(feature.properties, feature.geometry)
    const isHovered = hoveredParcel?.id === feature.id || 
                      hoveredParcel?.properties?.plot_id === feature.properties?.plot_id
    const isSelected = selectedParcel?.id === feature.id ||
                       selectedParcel?.properties?.plot_id === feature.properties?.plot_id

    const color = getParcelColor(status, isHovered, isSelected)

    return {
      fillColor: color,
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
      const ownerName = props.owner_name_hindi || props.owner_name_english || 'N/A'
      
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
