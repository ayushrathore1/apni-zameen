import { useState, useCallback, useMemo, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { FlyToInterpolator } from '@deck.gl/core'
import { GeoJsonLayer, BitmapLayer } from '@deck.gl/layers'
import { TileLayer } from '@deck.gl/geo-layers'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, MapPin, User, AlertTriangle, CheckCircle2, Ruler, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

// Initial view state - India wide view
const INITIAL_VIEW_STATE = {
  longitude: 78.9629,  // Center of India
  latitude: 20.5937,   // Center of India
  zoom: 5,             // India-wide view
  pitch: 0,            // Flat view initially
  bearing: 0,
  maxPitch: 85,
  minZoom: 4,
  maxZoom: 20
}

// Free tile sources (no API key required)
const TILE_SOURCES = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  streets: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  terrain: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
  topo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
}

// Color utilities
const hexToRgba = (hex, alpha = 255) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b, alpha]
}

// Color palette - adjusted for flat 2D display with strong highlighting
const COLORS = {
  verified: hexToRgba('#22C55E', 100),         // Light green, lower opacity for unselected
  discrepancyMedium: hexToRgba('#F59E0B', 140), // Orange for medium risk
  discrepancyHigh: hexToRgba('#EF4444', 160),   // Red for high risk  
  hover: hexToRgba('#FACC15', 180),             // Yellow on hover
  selected: hexToRgba('#2563EB', 200),          // Strong blue for selected (0.78 opacity)
  selectedBorder: hexToRgba('#1D4ED8', 255),    // Solid dark blue border
}

// Calculate centroid from GeoJSON geometry
function getCentroidFromGeometry(geometry) {
  if (!geometry) return null
  
  let coords = []
  
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0]
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0]
  } else if (geometry.type === 'Point') {
    return { lon: geometry.coordinates[0], lat: geometry.coordinates[1] }
  }
  
  if (!coords.length) return null
  
  let sumLon = 0, sumLat = 0
  for (const c of coords) {
    sumLon += c[0]
    sumLat += c[1]
  }
  
  return {
    lon: sumLon / coords.length,
    lat: sumLat / coords.length
  }
}

/**
 * Map3D - True 3D cadastral parcel visualization using Deck.gl
 * Uses free ESRI tiles - no API key required
 */
export function Map3D({ className }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const [parcels, setParcels] = useState(null)
  const [selectedPlotId, setSelectedPlotId] = useState(null)
  const [hoveredPlotId, setHoveredPlotId] = useState(null)
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tileSource, setTileSource] = useState('satellite')

  // Load parcels data
  useEffect(() => {
    async function loadParcels() {
      try {
        const data = await api.get('/parcels/geojson')
        setParcels(data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load parcels:', error)
        setLoading(false)
      }
    }
    loadParcels()
  }, [])

  // Get fill color based on state and discrepancy
  const getFillColor = useCallback((feature) => {
    const props = feature.properties
    const plotId = props.plot_id

    if (plotId === selectedPlotId) return COLORS.selected
    if (plotId === hoveredPlotId) return COLORS.hover
    if (props.has_discrepancy) {
      return props.discrepancy_severity === 'high' 
        ? COLORS.discrepancyHigh 
        : COLORS.discrepancyMedium
    }
    return COLORS.verified
  }, [selectedPlotId, hoveredPlotId])

  // Get elevation - flat for proper polygon display (no extrusion)
  const getElevation = useCallback((feature) => {
    // Return 0 for flat display - no 3D extrusion to avoid bounding box issues
    return 0
  }, [])

  // Get line color
  const getLineColor = useCallback((feature) => {
    const plotId = feature.properties.plot_id
    if (plotId === selectedPlotId) return COLORS.selectedBorder
    return [30, 30, 30, 150]
  }, [selectedPlotId])

  // Get line width - thicker borders for selected parcels
  const getLineWidth = useCallback((feature) => {
    const plotId = feature.properties.plot_id
    if (plotId === selectedPlotId) return 5  // Strong border for selected
    if (plotId === hoveredPlotId) return 3   // Medium border for hovered
    return 1                                  // Thin border for others
  }, [selectedPlotId, hoveredPlotId])

  // Handle parcel click
  const handleClick = useCallback((info) => {
    if (info.object) {
      const props = info.object.properties
      setSelectedPlotId(props.plot_id)
      setSelectedParcel(info.object)
      
      // Fly to parcel with smooth animation
      const lon = props.centroid_lon || info.coordinate?.[0]
      const lat = props.centroid_lat || info.coordinate?.[1]
      
      if (lon && lat) {
        setViewState(prev => ({
          ...prev,
          longitude: lon,
          latitude: lat,
          zoom: 16,
          pitch: 60,
          bearing: 30,
          transitionDuration: 1500,
          transitionInterpolator: new FlyToInterpolator()
        }))
      }
    }
  }, [])

  // Handle hover
  const handleHover = useCallback((info) => {
    setHoveredPlotId(info.object?.properties?.plot_id || null)
  }, [])

  // Handle map click (deselect)
  const handleMapClick = useCallback(() => {
    setSelectedPlotId(null)
    setSelectedParcel(null)
  }, [])

  // Search select handler
  const handleSearchSelect = useCallback(async (result) => {
    const plotId = result.plot_id
    if (!plotId) return
    
    console.log('Search selected:', plotId) // Debug log
    
    try {
      // First try to get full parcel data from API
      const data = await api.get('/search/plot', { plot_id: plotId })
      console.log('Search API response:', data) // Debug log
      
      if (data.found && data.parcel) {
        const props = data.parcel.properties
        const geometry = data.parcel.geometry
        
        setSelectedPlotId(props.plot_id)
        setSelectedParcel(data.parcel)
        
        // Get coordinates - first try properties, then calculate from geometry
        let lon = props.centroid_lon
        let lat = props.centroid_lat
        
        if (!lon || !lat) {
          const centroid = getCentroidFromGeometry(geometry)
          if (centroid) {
            lon = centroid.lon
            lat = centroid.lat
          }
        }
        
        console.log('Zoom coordinates:', { lon, lat }) // Debug log
        
        if (lon && lat) {
          setViewState(prev => ({
            ...prev,
            longitude: lon,
            latitude: lat,
            zoom: 17,
            pitch: 60,
            bearing: 45,
            transitionDuration: 2000,
            transitionInterpolator: new FlyToInterpolator()
          }))
        }
      } else if (result.centroid_lon && result.centroid_lat) {
        // Fallback to search result coordinates
        setSelectedPlotId(plotId)
        setViewState(prev => ({
          ...prev,
          longitude: result.centroid_lon,
          latitude: result.centroid_lat,
          zoom: 17,
          pitch: 60,
          bearing: 45,
          transitionDuration: 2000,
          transitionInterpolator: new FlyToInterpolator()
        }))
      }
    } catch (error) {
      console.error('Search failed:', error)
      // Still try to zoom if we have coordinates from search result
      if (result.centroid_lon && result.centroid_lat) {
        setSelectedPlotId(plotId)
        setViewState(prev => ({
          ...prev,
          longitude: result.centroid_lon,
          latitude: result.centroid_lat,
          zoom: 17,
          pitch: 60,
          bearing: 45,
          transitionDuration: 2000,
          transitionInterpolator: new FlyToInterpolator()
        }))
      }
    }
  }, [])

  // Create layers
  const layers = useMemo(() => {
    const layersList = [
      // Tile layer - free satellite imagery from ESRI
      new TileLayer({
        id: 'tile-layer',
        data: TILE_SOURCES[tileSource],
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: props => {
          const { boundingBox } = props.tile
          return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
          })
        }
      })
    ]

    // Add parcels layer if data loaded
    if (parcels) {
      layersList.push(
        new GeoJsonLayer({
          id: 'parcels-2d',
          data: parcels,
          filled: true,
          extruded: false,  // DISABLED - use flat polygons for exact geometry
          stroked: true,
          getFillColor,
          getLineColor,
          getLineWidth,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 1,
          pickable: true,
          autoHighlight: false,
          onClick: handleClick,
          onHover: handleHover,
          updateTriggers: {
            getFillColor: [selectedPlotId, hoveredPlotId],
            getLineColor: [selectedPlotId],
            getLineWidth: [selectedPlotId, hoveredPlotId],
          }
        })
      )
    }

    return layersList
  }, [parcels, tileSource, selectedPlotId, hoveredPlotId, getFillColor, getElevation, getLineColor, getLineWidth, handleClick, handleHover])

  return (
    <div className={cn('relative w-full h-full bg-slate-900', className)}>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading 3D parcels...</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="absolute top-4 left-4 z-40 w-80 max-w-[calc(100%-2rem)]">
        <ParcelSearch3D onSelect={handleSearchSelect} />
      </div>

      {/* Tile source selector */}
      <div className="absolute top-4 right-4 z-40 flex gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border">
        {Object.keys(TILE_SOURCES).map((key) => (
          <button
            key={key}
            onClick={() => setTileSource(key)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md capitalize transition-colors",
              tileSource === key 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent text-foreground"
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Deck.gl standalone */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        onClick={(info) => {
          if (!info.object) handleMapClick()
        }}
        getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
        style={{ background: '#1a1a2e' }}
        glOptions={{
          preserveDrawingBuffer: true,
          antialias: true,
          failIfMajorPerformanceCaveat: false
        }}
        onWebGLInitialized={(gl) => {
          console.log('WebGL initialized successfully')
        }}
        onError={(error) => {
          console.error('Deck.gl error:', error)
        }}
      />

      {/* Parcel Info Panel */}
      <AnimatePresence>
        {selectedParcel && (
          <ParcelInfoPanel3D
            parcel={selectedParcel}
            onClose={() => {
              setSelectedPlotId(null)
              setSelectedParcel(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-40 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
        <p className="text-xs font-medium text-foreground mb-2">3D Legend</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: '#22C55E' }} />
            <span className="text-muted-foreground">Verified (Low)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
            <span className="text-muted-foreground">Medium Risk (Tall)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
            <span className="text-muted-foreground">High Risk (Tallest)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: '#3B82F6' }} />
            <span className="text-muted-foreground">Selected</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Search component for 3D map
 */
function ParcelSearch3D({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await api.get('/search/', { q: query, limit: 10 })
        setResults(data.results || [])
        setIsOpen(true)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result) => {
    setQuery(result.plot_id || result.owner_name_hindi)
    setIsOpen(false)
    onSelect(result)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Plot ID or Owner..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin" />}
        {query && !isLoading && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="size-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto"
          >
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id || index}`}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-accent border-b border-border last:border-0"
              >
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center",
                  result.type === 'parcel' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                )}>
                  {result.type === 'parcel' ? <MapPin className="size-4" /> : <User className="size-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {result.type === 'parcel' ? result.plot_id : result.owner_name_hindi}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.village_name || result.plot_id}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Info panel for selected parcel
 */
function ParcelInfoPanel3D({ parcel, onClose }) {
  const props = parcel.properties || parcel
  const hasDiscrepancy = props.has_discrepancy
  const severity = props.discrepancy_severity

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-20 right-4 z-40 w-80 max-w-[calc(100%-2rem)]"
    >
      <div className={cn(
        "bg-card border-2 rounded-xl shadow-2xl overflow-hidden",
        hasDiscrepancy
          ? severity === 'high' ? "border-red-500" : "border-amber-500"
          : "border-green-500"
      )}>
        {/* Header */}
        <div className={cn(
          "px-4 py-3 flex items-center justify-between",
          hasDiscrepancy
            ? severity === 'high' ? "bg-red-500/10" : "bg-amber-500/10"
            : "bg-green-500/10"
        )}>
          <div>
            <h3 className="font-bold text-foreground">{props.plot_id}</h3>
            <p className="text-sm text-muted-foreground">{props.village_name}</p>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
            hasDiscrepancy
              ? severity === 'high' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          )}>
            {hasDiscrepancy ? (
              <><AlertTriangle className="size-3" />{severity === 'high' ? 'High Risk' : 'Review'}</>
            ) : (
              <><CheckCircle2 className="size-3" />Verified</>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Owner */}
          <div className="bg-accent/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Owner</span>
            </div>
            <p className="font-medium text-foreground">{props.owner_name_hi || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{props.owner_name_en}</p>
          </div>

          {/* Area comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Ruler className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Map</span>
              </div>
              <p className="font-bold text-foreground">{props.computed_area_sqm?.toFixed(0)} m²</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <span className="text-xs text-muted-foreground">Recorded</span>
              <p className="font-bold text-foreground">{props.recorded_area_sqm?.toFixed(0)} m²</p>
            </div>
          </div>

          {/* Discrepancy alert */}
          {hasDiscrepancy && (
            <div className={cn(
              "rounded-lg p-3 flex items-start gap-2",
              severity === 'high' ? "bg-red-100" : "bg-amber-100"
            )}>
              <AlertTriangle className={cn(
                "size-4 flex-shrink-0 mt-0.5",
                severity === 'high' ? "text-red-600" : "text-amber-600"
              )} />
              <div>
                <p className={cn(
                  "font-semibold text-sm",
                  severity === 'high' ? "text-red-700" : "text-amber-700"
                )}>
                  Area Mismatch: {Math.abs(props.discrepancy_percentage || 0).toFixed(1)}%
                </p>
                <p className={cn(
                  "text-xs",
                  severity === 'high' ? "text-red-600" : "text-amber-600"
                )}>
                  Difference: {Math.abs(props.area_difference_sqm || 0).toFixed(0)} m²
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2 text-center text-xs text-muted-foreground hover:bg-accent border-t border-border"
        >
          Click to close
        </button>
      </div>
    </motion.div>
  )
}
