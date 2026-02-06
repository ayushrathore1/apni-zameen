import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, LayersControl, useMap, useMapEvents } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, Locate, Layers } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import { Button, Spinner } from '@/components/ui'
import { ParcelLayer } from './ParcelLayer'
import { ParcelCard } from './ParcelCard'
import { ParcelSearch } from './ParcelSearch'
import { MAP_CONFIG, TILE_LAYERS } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Map controls component
function MapControls({ onLayerToggle, showLayerPanel }) {
  const map = useMap()

  const handleZoomIn = () => map.zoomIn()
  const handleZoomOut = () => map.zoomOut()
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 16 })
  }

  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
      <Button
        variant="secondary"
        size="icon"
        onClick={handleZoomIn}
        className="shadow-lg"
        aria-label="Zoom in"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={handleZoomOut}
        className="shadow-lg"
        aria-label="Zoom out"
      >
        <ZoomOut className="size-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={handleLocate}
        className="shadow-lg"
        aria-label="Find my location"
      >
        <Locate className="size-4" />
      </Button>
      <Button
        variant={showLayerPanel ? 'default' : 'secondary'}
        size="icon"
        onClick={onLayerToggle}
        className="shadow-lg"
        aria-label="Toggle layer switcher"
      >
        <Layers className="size-4" />
      </Button>
    </div>
  )
}

// Layer switcher panel
function LayerSwitcher({ activeLayer, onLayerChange, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-16 top-4 z-[1000] bg-card border border-border rounded-lg shadow-xl p-3 min-w-48"
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">Map Layers</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(TILE_LAYERS).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => onLayerChange(key)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
              activeLayer === key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-foreground'
            )}
          >
            <div
              className={cn(
                'size-3 rounded-full border-2',
                activeLayer === key ? 'bg-primary-foreground border-primary-foreground' : 'border-muted-foreground'
              )}
            />
            <span>{layer.name}</span>
            <span className="text-xs opacity-60 ml-auto">{layer.nameHi}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// Map event handler
function MapEventHandler({ onParcelClick, onMapClick }) {
  useMapEvents({
    click: (e) => {
      // Only trigger if not clicking on a parcel
      if (!e.originalEvent.target.closest('.leaflet-interactive')) {
        onMapClick?.()
      }
    },
  })
  return null
}

// Fly to location hook
function FlyToLocation({ center, zoom }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 16, {
        duration: 1.5,
      })
    }
  }, [center, zoom, map])
  
  return null
}

export function LandMap({ 
  className,
  parcels = [],
  selectedParcel,
  onParcelSelect,
  onParcelClose,
  flyToCenter,
  flyToZoom,
  loading = false,
}) {
  const [hoveredParcel, setHoveredParcel] = useState(null)
  const [activeLayer, setActiveLayer] = useState(MAP_CONFIG.defaultLayer || 'satellite')
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [searchFlyTo, setSearchFlyTo] = useState(null)
  const [searchZoom, setSearchZoom] = useState(18)

  // Handle search location zoom
  const handleSearchLocationSelect = useCallback((center, zoom) => {
    setSearchFlyTo(center)
    setSearchZoom(zoom || 18)
  }, [])

  // Handle search parcel selection - stores the full parcel data for highlighting
  const [highlightedParcel, setHighlightedParcel] = useState(null)

  // Sync highlighted parcel with parent-selected parcel so boundary shows for both in-map and page-level search
  useEffect(() => {
    if (selectedParcel?.geometry) {
      setHighlightedParcel(selectedParcel)
    } else if (!selectedParcel) {
      setHighlightedParcel(null)
    }
  }, [selectedParcel])
  
  const handleSearchParcelSelect = useCallback((parcel) => {
    setHighlightedParcel(parcel)
    onParcelSelect?.(parcel)
  }, [onParcelSelect])

  const handleParcelClick = useCallback((parcel) => {
    onParcelSelect?.(parcel)
  }, [onParcelSelect])

  const handleParcelHover = useCallback((parcel) => {
    setHoveredParcel(parcel)
  }, [])

  const handleParcelLeave = useCallback(() => {
    setHoveredParcel(null)
  }, [])

  const handleMapClick = useCallback(() => {
    onParcelClose?.()
    setShowLayerPanel(false)
    setHighlightedParcel(null)  // Clear highlighted parcel on map click
  }, [onParcelClose])

  const handleLayerChange = useCallback((layerKey) => {
    setActiveLayer(layerKey)
  }, [])

  const currentLayer = TILE_LAYERS[activeLayer] || TILE_LAYERS.satellite

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-[1000] w-80 max-w-[calc(100%-6rem)]">
        <ParcelSearch 
          onLocationSelect={handleSearchLocationSelect}
          onParcelSelect={handleSearchParcelSelect}
        />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading parcels...</p>
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={MAP_CONFIG.defaultCenter}
        zoom={MAP_CONFIG.defaultZoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        {/* Active Tile Layer */}
        <TileLayer
          key={activeLayer}
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          maxZoom={currentLayer.maxZoom}
        />
        
        {/* Hybrid mode: add labels overlay */}
        {activeLayer === 'hybrid' && currentLayer.labels && (
          <TileLayer
            url={currentLayer.labels}
            maxZoom={currentLayer.maxZoom}
          />
        )}
        
        <MapControls 
          onLayerToggle={() => setShowLayerPanel(!showLayerPanel)}
          showLayerPanel={showLayerPanel}
        />
        <MapEventHandler onMapClick={handleMapClick} />
        
        {flyToCenter && (
          <FlyToLocation center={flyToCenter} zoom={flyToZoom} />
        )}
        
        {/* Search-triggered fly to */}
        {searchFlyTo && (
          <FlyToLocation center={searchFlyTo} zoom={searchZoom} />
        )}
        
        <ParcelLayer
          parcels={highlightedParcel ? [...(Array.isArray(parcels) ? parcels : []), highlightedParcel] : parcels}
          selectedParcel={selectedParcel}
          hoveredParcel={hoveredParcel}
          highlightedParcelId={highlightedParcel?.properties?.plot_id}
          onParcelClick={handleParcelClick}
          onParcelHover={handleParcelHover}
          onParcelLeave={handleParcelLeave}
        />
        
        {/* Info panel for highlighted parcel (boundary now rendered by ParcelLayer) */}
      </MapContainer>

      {/* Layer Switcher Panel */}
      <AnimatePresence>
        {showLayerPanel && (
          <LayerSwitcher
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
            onClose={() => setShowLayerPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Hovered Parcel Tooltip */}
      <AnimatePresence>
        {hoveredParcel && !selectedParcel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 z-[1000] bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs"
          >
            <p className="font-medium text-foreground">
              Plot: {hoveredParcel.properties?.plot_id}
            </p>
            <p className="text-sm text-muted-foreground">
              {hoveredParcel.properties?.village_name || 'Click for details'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Parcel Side Panel */}
      <AnimatePresence>
        {selectedParcel && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full sm:w-96 z-[1000] bg-card border-l border-border shadow-xl overflow-auto"
          >
            <div className="sticky top-0 flex items-center justify-between p-4 bg-card border-b border-border">
              <h2 className="font-semibold text-foreground">Parcel Details</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onParcelClose}
                aria-label="Close panel"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-4">
              <ParcelCard parcel={selectedParcel} expanded />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

