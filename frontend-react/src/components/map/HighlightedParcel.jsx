import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, MapPin, Ruler, User, TrendingDown, TrendingUp, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAreaDiscrepancy, getStatusBadge, getDiscrepancyDescription, calculatePolygonArea } from '@/lib/areaUtils'

/**
 * HighlightedParcel - Shows a 3D-like highlighted polygon for the selected parcel
 * with pulsing border effect and detailed info panel
 */
export function HighlightedParcel({ parcel, onClose }) {
  const map = useMap()
  const layerRef = useRef(null)
  
  // Parse parcel data
  const parcelData = useMemo(() => {
    if (!parcel) return null
    
    // Handle both GeoJSON Feature format and plain object
    const props = parcel.properties || parcel
    const geometry = parcel.geometry
    
    return { props, geometry }
  }, [parcel])
  
  // Fit map to parcel bounds when selected
  useEffect(() => {
    if (parcelData?.geometry && layerRef.current) {
      try {
        const bounds = layerRef.current.getBounds()
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 18 })
      } catch (e) {
        console.error('Error fitting bounds:', e)
      }
    }
  }, [parcelData, map])
  
  if (!parcelData || !parcelData.geometry) return null
  
  const { props, geometry } = parcelData
  
  // Calculate area discrepancy
  const computedArea = calculatePolygonArea(geometry) || props.computed_area_sqm
  const recordedArea = props.recorded_area_sqm
  const discrepancy = getAreaDiscrepancy(computedArea, recordedArea)
  
  // Get styling colors based on discrepancy
  const severityColor = {
    critical: { fill: '#EF4444', border: '#DC2626', light: '#FEE2E2', darkBg: '#7F1D1D' },
    major: { fill: '#F59E0B', border: '#D97706', light: '#FEF3C7', darkBg: '#78350F' },
    minor: { fill: '#FBBF24', border: '#F59E0B', light: '#FEFCE8', darkBg: '#713F12' },
    none: { fill: '#22C55E', border: '#16A34A', light: '#DCFCE7', darkBg: '#15803D' },
  }
  
  const colorScheme = severityColor[discrepancy.severity] || severityColor.none
  
  // 3D-like highlight style with glow effect
  const highlightStyle = {
    fillColor: colorScheme.fill,
    fillOpacity: 0.4,
    color: colorScheme.border,
    weight: 4,
    opacity: 1,
    // Add dash pattern for critical/major discrepancies
    dashArray: discrepancy.severity === 'critical' ? '10, 5' : discrepancy.severity === 'major' ? '8, 4' : null,
  }
  
  // Shadow/outline layer for 3D effect
  const shadowStyle = {
    fillColor: 'transparent',
    fillOpacity: 0,
    color: '#000000',
    weight: 8,
    opacity: 0.3,
  }
  
  // Glow layer
  const glowStyle = {
    fillColor: 'transparent',
    fillOpacity: 0,
    color: colorScheme.fill,
    weight: 12,
    opacity: 0.2,
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
        ref={layerRef}
        data={geoJsonFeature}
        style={() => highlightStyle}
        onEachFeature={(feature, layer) => {
          // Pulsing animation effect via CSS class
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
  
  const computedArea = parcel.computed_area_sqm
  const recordedArea = parcel.recorded_area_sqm
  const discrepancy = getAreaDiscrepancy(computedArea, recordedArea)
  const statusBadge = getStatusBadge(discrepancy)
  const description = getDiscrepancyDescription(discrepancy)
  
  return (
    <div className="leaflet-top leaflet-left" style={{ top: '60px', left: '340px', zIndex: 1000 }}>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={cn(
          "bg-card border-2 rounded-xl shadow-2xl p-4 min-w-72 max-w-md",
          discrepancy.severity === 'critical' 
            ? "border-red-500" 
            : discrepancy.severity === 'major'
            ? "border-amber-500"
            : discrepancy.severity === 'minor'
            ? "border-yellow-500"
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
            discrepancy.severity === 'critical'
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : discrepancy.severity === 'major'
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : discrepancy.severity === 'minor'
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          )}>
            {discrepancy.severity === 'critical' ? (
              <>
                <AlertTriangle className="size-4" />
                Critical
              </>
            ) : discrepancy.severity === 'major' ? (
              <>
                <AlertTriangle className="size-4" />
                Review
              </>
            ) : discrepancy.severity === 'minor' ? (
              <>
                <Info className="size-4" />
                Variance
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
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
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Ruler className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Computed</span>
            </div>
            <p className="font-bold text-foreground">{computedArea?.toFixed(0) || 'N/A'} m²</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Recorded</span>
            <p className="font-bold text-foreground">{recordedArea?.toFixed(0) || 'N/A'} m²</p>
          </div>
        </div>
        
        {/* Discrepancy Alert */}
        {discrepancy.hasDiscrepancy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "rounded-lg p-3 mb-3 flex items-start gap-3 border",
              discrepancy.severity === 'critical'
                ? "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800"
                : discrepancy.severity === 'major'
                ? "bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800"
                : "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800"
            )}
          >
            <AlertTriangle className={cn(
              "size-5 flex-shrink-0 mt-0.5",
              discrepancy.severity === 'critical' ? "text-red-600" : 
              discrepancy.severity === 'major' ? "text-amber-600" : "text-yellow-600"
            )} />
            <div className="flex-1">
              <p className={cn(
                "font-semibold text-sm mb-1",
                discrepancy.severity === 'critical' ? "text-red-700 dark:text-red-400" : 
                discrepancy.severity === 'major' ? "text-amber-700 dark:text-amber-400" : "text-yellow-700 dark:text-yellow-400"
              )}>
                {discrepancy.severity === 'critical' ? 'Critical Area Discrepancy' : 
                 discrepancy.severity === 'major' ? 'Area Variance Detected' : 'Minor Area Variation'}
              </p>
              <p className={cn(
                "text-xs leading-relaxed",
                discrepancy.severity === 'critical' ? "text-red-600 dark:text-red-300" : 
                discrepancy.severity === 'major' ? "text-amber-600 dark:text-amber-300" : "text-yellow-600 dark:text-yellow-300"
              )}>
                {description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {discrepancy.isUnderRecorded && <TrendingDown className="size-3" />}
                {discrepancy.isOverRecorded && <TrendingUp className="size-3" />}
                <span className="text-xs font-semibold">
                  {Math.abs(discrepancy.difference).toFixed(0)} m² • {discrepancy.absolutePercentage.toFixed(1)}%
                </span>
              </div>
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
