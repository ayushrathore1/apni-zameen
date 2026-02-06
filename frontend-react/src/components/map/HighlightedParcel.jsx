import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { GeoJSON, useMap } from 'react-leaflet'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, MapPin, Ruler, User } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Get all [lon, lat] rings from GeoJSON geometry (Polygon or MultiPolygon). */
function getGeometryRings(geometry) {
  if (!geometry || !geometry.coordinates) return []
  if (geometry.type === 'Polygon') {
    return geometry.coordinates
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat()
  }
  return []
}

/** Compute Leaflet LatLngBounds from GeoJSON geometry. */
function boundsFromGeometry(geometry) {
  const rings = getGeometryRings(geometry)
  if (rings.length === 0) return null
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity
  for (const ring of rings) {
    for (const coord of ring) {
      const [lon, lat] = coord
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
    }
  }
  if (minLat === Infinity) return null
  return L.latLngBounds(
    [minLat, minLon],
    [maxLat, maxLon]
  )
}

/**
 * HighlightedParcel - Shows a highlighted polygon for the selected parcel
 * with clear boundary and detailed info panel
 */
export function HighlightedParcel({ parcel, onClose }) {
  const map = useMap()
  
  // Parse parcel data
  const parcelData = useMemo(() => {
    if (!parcel) return null
    
    // Handle both GeoJSON Feature format and plain object
    const props = parcel.properties || parcel
    const geometry = parcel.geometry
    
    return { props, geometry }
  }, [parcel])
  
  // Fit map to parcel bounds from geometry (reliable, no ref needed)
  useEffect(() => {
    if (!parcelData?.geometry || !map) return
    const bounds = boundsFromGeometry(parcelData.geometry)
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 })
    }
  }, [parcelData, map])
  
  if (!parcelData || !parcelData.geometry) return null
  
  const { props, geometry } = parcelData
  const hasDiscrepancy = props.has_discrepancy
  const severity = props.discrepancy_severity
  
  // Highlight style: clear boundary, high contrast
  const highlightStyle = {
    fillColor: hasDiscrepancy
      ? (severity === 'high' ? '#EF4444' : '#F59E0B')
      : '#22C55E',
    fillOpacity: 0.45,
    color: hasDiscrepancy
      ? (severity === 'high' ? '#DC2626' : '#D97706')
      : '#16A34A',
    weight: 5,
    opacity: 1,
    dashArray: hasDiscrepancy ? '10, 5' : null,
  }

  // Shadow/outline layer for depth
  const shadowStyle = {
    fillColor: 'transparent',
    fillOpacity: 0,
    color: '#000000',
    weight: 9,
    opacity: 0.35,
  }

  // Glow layer
  const glowStyle = {
    fillColor: 'transparent',
    fillOpacity: 0,
    color: hasDiscrepancy
      ? (severity === 'high' ? '#EF4444' : '#F59E0B')
      : '#22C55E',
    weight: 14,
    opacity: 0.25,
  }
  
  const geoJsonFeature = {
    type: 'Feature',
    geometry: geometry,
    properties: props
  }
  
  return (
    <>
      {/* Outer glow layer */}
      <GeoJSON
        data={geoJsonFeature}
        style={() => glowStyle}
      />
      
      {/* Shadow layer for depth */}
      <GeoJSON
        data={geoJsonFeature}
        style={() => shadowStyle}
      />
      
      {/* Main highlight layer */}
      <GeoJSON
        data={geoJsonFeature}
        style={() => highlightStyle}
        onEachFeature={(feature, layer) => {
          layer.getElement?.()?.classList.add('parcel-highlight-pulse')
        }}
      />
      
      {/* Info Panel Overlay */}
      <ParcelInfoPanel parcel={props} onClose={onClose} />
    </>
  )
}

/**
 * Floating info panel showing parcel details
 */
function ParcelInfoPanel({ parcel, onClose }) {
  if (!parcel) return null
  
  const hasDiscrepancy = parcel.has_discrepancy
  const severity = parcel.discrepancy_severity
  const diffPercent = Math.abs(parcel.discrepancy_percentage || 0)
  const areaDiff = Math.abs(parcel.area_difference_sqm || 0)
  
  return (
    <div className="leaflet-top leaflet-left" style={{ top: '60px', left: '340px', zIndex: 1000 }}>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={cn(
          "bg-card border-2 rounded-xl shadow-2xl p-4 min-w-72 max-w-md",
          hasDiscrepancy 
            ? severity === 'high' 
              ? "border-red-500" 
              : "border-amber-500"
            : "border-green-500"
        )}
      >
        {/* Header with status */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="size-5" />
              {parcel.plot_id}
            </h3>
            <p className="text-sm text-muted-foreground">{parcel.village_name}</p>
          </div>
          
          {/* Status Badge */}
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1",
            hasDiscrepancy
              ? severity === 'high'
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          )}>
            {hasDiscrepancy ? (
              <>
                <AlertTriangle className="size-4" />
                {severity === 'high' ? 'High Risk' : 'Review'}
              </>
            ) : (
              <>
                <CheckCircle className="size-4" />
                Verified
              </>
            )}
          </div>
        </div>
        
        {/* Owner Info */}
        <div className="bg-accent/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <User className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Owner</span>
          </div>
          <p className="font-medium text-foreground">{parcel.owner_name_hi}</p>
          <p className="text-sm text-muted-foreground">{parcel.owner_name_en}</p>
          <p className="text-xs text-muted-foreground mt-1">S/o {parcel.father_name_hi}</p>
        </div>
        
        {/* Area Comparison */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-accent/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Ruler className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Map Area</span>
            </div>
            <p className="font-bold text-foreground">{parcel.computed_area_sqm?.toFixed(0)} m²</p>
          </div>
          <div className="bg-accent/50 rounded-lg p-3">
            <span className="text-xs text-muted-foreground">Recorded Area</span>
            <p className="font-bold text-foreground">{parcel.recorded_area_sqm?.toFixed(0)} m²</p>
            <p className="text-xs text-muted-foreground">{parcel.area_text}</p>
          </div>
        </div>
        
        {/* Discrepancy Alert */}
        {hasDiscrepancy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "rounded-lg p-3 mb-3 flex items-start gap-3",
              severity === 'high'
                ? "bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800"
                : "bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800"
            )}
          >
            <AlertTriangle className={cn(
              "size-5 flex-shrink-0 mt-0.5",
              severity === 'high' ? "text-red-600" : "text-amber-600"
            )} />
            <div>
              <p className={cn(
                "font-semibold text-sm",
                severity === 'high' ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
              )}>
                Area Mismatch Detected
              </p>
              <p className={cn(
                "text-sm",
                severity === 'high' ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"
              )}>
                Difference: <strong>{areaDiff.toFixed(0)} m²</strong> ({diffPercent.toFixed(1)}%)
              </p>
            </div>
          </motion.div>
        )}
        
        {/* Additional Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Land Type:</span>
            <span className="ml-1 text-foreground">{parcel.land_type_hi || parcel.land_type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Khata:</span>
            <span className="ml-1 text-foreground">{parcel.khata_number}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Survey Year:</span>
            <span className="ml-1 text-foreground">{parcel.survey_year}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Value:</span>
            <span className="ml-1 text-foreground">₹{(parcel.estimated_value_inr || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        {/* Close hint */}
        <p className="text-xs text-center text-muted-foreground mt-3 pt-3 border-t border-border">
          Click on the map to close
        </p>
      </motion.div>
    </div>
  )
}
