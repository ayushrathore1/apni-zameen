/**
 * ThreeDMap.jsx
 * 
 * True 3D cadastral parcel visualization using Three.js.
 * Features:
 * - Ground plane with parcel polygons
 * - Exact polygon extrusion (not bounding box)
 * - Camera fly-to animation on selection
 * - Search integration with parcel highlight
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, MapPin, User, AlertTriangle, CheckCircle, Ruler, Loader2, Layers } from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

// Colors
const COLORS = {
  verified: 0x22c55e,
  discrepancyMedium: 0xf59e0b,
  discrepancyHigh: 0xef4444,
  selected: 0x2563eb,
  selectedBorder: 0x1d4ed8,
  ground: 0x1e293b
}

/**
 * Simple helper to convert GeoJSON polygon to THREE.Shape
 * Using local coordinates relative to center
 */
function polygonToShape(coordinates, center) {
  const shape = new THREE.Shape()
  
  // Scale: smaller scale to keep parcels near origin
  // 0.01 degrees difference = ~10 units in scene
  const scale = 1000 // Much smaller for better camera view
  
  coordinates.forEach((coord, i) => {
    const x = (coord[0] - center[0]) * scale
    const y = (coord[1] - center[1]) * scale
    
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  })
  
  shape.closePath()
  return shape
}

/**
 * Get centroid of a polygon
 */
function getPolygonCentroid(coordinates) {
  let sumX = 0, sumY = 0
  const len = coordinates.length
  
  for (const coord of coordinates) {
    sumX += coord[0]
    sumY += coord[1]
  }
  
  return [sumX / len, sumY / len]
}

/**
 * Extruded Parcel Mesh - renders a parcel as 3D extruded polygon
 */
function ExtrudedParcel({ feature, center, isSelected, onClick }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  const { geometry, edgesGeometry } = useMemo(() => {
    if (!feature || !feature.geometry) return { geometry: null, edgesGeometry: null }
    
    try {
      let coordinates
      if (feature.geometry.type === 'Polygon') {
        coordinates = feature.geometry.coordinates[0]
      } else if (feature.geometry.type === 'MultiPolygon') {
        coordinates = feature.geometry.coordinates[0][0]
      } else {
        return { geometry: null, edgesGeometry: null }
      }
      
      // Log first parcel coordinates for debugging
      if (feature.properties?.plot_id && Math.random() < 0.01) {
        const scale = 1000
        const sampleCoord = coordinates[0]
        console.log('Sample parcel coord:', {
          plot_id: feature.properties.plot_id,
          rawCoord: sampleCoord,
          center: center,
          transformed: [
            (sampleCoord[0] - center[0]) * scale,
            (sampleCoord[1] - center[1]) * scale
          ]
        })
      }
      
      const shape = polygonToShape(coordinates, center)
      
      // Extrusion height based on state
      const props = feature.properties
      let height = 5 // Default height for verified
      
      if (isSelected) {
        height = 30
      } else if (props.has_discrepancy) {
        height = props.discrepancy_severity === 'high' ? 20 : 12
      }
      
      const extrudeSettings = {
        depth: height,
        bevelEnabled: false
      }
      
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      
      // Rotate to lay flat (XZ plane)
      geo.rotateX(-Math.PI / 2)
      
      const edges = new THREE.EdgesGeometry(geo)
      
      return { geometry: geo, edgesGeometry: edges }
    } catch (e) {
      console.error('Error creating parcel geometry:', e, feature.properties?.plot_id)
      return { geometry: null, edgesGeometry: null }
    }
  }, [feature, center, isSelected])
  
  // Pulse animation for selected
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.03
      meshRef.current.scale.y = pulse
    }
  })
  
  if (!geometry) return null
  
  const props = feature.properties
  
  // Determine color
  let color = COLORS.verified
  let opacity = 0.6
  
  if (isSelected) {
    color = COLORS.selected
    opacity = 0.85
  } else if (hovered) {
    color = 0xfacc15 // Yellow hover
    opacity = 0.8
  } else if (props.has_discrepancy) {
    color = props.discrepancy_severity === 'high' ? COLORS.discrepancyHigh : COLORS.discrepancyMedium
    opacity = 0.7
  }
  
  return (
    <group>
      <mesh 
        ref={meshRef} 
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(feature)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Edges */}
      {edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial 
            color={isSelected ? 0x1d4ed8 : 0x374151}
            transparent
            opacity={isSelected ? 1 : 0.5}
          />
        </lineSegments>
      )}
    </group>
  )
}

/**
 * All Parcels Layer
 */
function ParcelsLayer({ parcels, selectedPlotId, center, onParcelClick }) {
  if (!parcels || !parcels.features) {
    console.log('No parcels to render')
    return null
  }
  
  console.log(`Rendering ${parcels.features.length} parcels`)
  
  return (
    <group>
      {parcels.features.map((feature, idx) => {
        const props = feature.properties
        const isSelected = props.plot_id === selectedPlotId
        
        return (
          <ExtrudedParcel
            key={props.plot_id || idx}
            feature={feature}
            center={center}
            isSelected={isSelected}
            onClick={onParcelClick}
          />
        )
      })}
    </group>
  )
}

/**
 * Ground Plane
 */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[10000, 10000]} />
      <meshStandardMaterial 
        color={COLORS.ground}
        transparent
        opacity={0.5}
      />
    </mesh>
  )
}

/**
 * Camera Controller with fly-to animation
 */
function CameraController({ target, zoom }) {
  const { camera } = useThree()
  const controlsRef = useRef()
  
  useEffect(() => {
    if (target && controlsRef.current) {
      // Animate to target
      const targetVec = new THREE.Vector3(target.x, 0, target.z)
      controlsRef.current.target.copy(targetVec)
      
      // Position camera above and behind
      camera.position.set(target.x + 100, zoom || 200, target.z + 150)
      controlsRef.current.update()
    }
  }, [target, zoom, camera])
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={50}
      maxDistance={5000}
    />
  )
}

/**
 * Search Component
 */
function ParcelSearch3D({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.get('/search/', { q: query, limit: 10 })
        setResults(data.results || [])
        setIsOpen(true)
      } catch (e) {
        console.error('Search error:', e)
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result) => {
    setQuery(result.plot_id || result.owner_name_hindi || '')
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
          placeholder="Search by Plot ID or Owner Name..."
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-card/95 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl overflow-hidden z-50"
          >
            {results.map((result, idx) => (
              <button
                key={result.id || idx}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3 border-b border-border last:border-0"
              >
                <MapPin className="size-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{result.plot_id}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.owner_name_hindi || result.village_name}
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
 * Info Panel
 */
function ParcelInfoPanel({ parcel, onClose }) {
  if (!parcel) return null
  
  const props = parcel.properties || parcel
  const hasDiscrepancy = props.has_discrepancy
  const severity = props.discrepancy_severity
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-80 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl overflow-hidden z-40"
    >
      <div className={cn(
        "px-4 py-3 border-b border-border",
        hasDiscrepancy 
          ? severity === 'high' ? "bg-red-500/10" : "bg-amber-500/10"
          : "bg-green-500/10"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MapPin className="size-5" />
            {props.plot_id}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{props.village_name}</p>
      </div>
      
      <div className="px-4 py-2">
        <span className={cn(
          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold",
          hasDiscrepancy
            ? severity === 'high'
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        )}>
          {hasDiscrepancy ? <AlertTriangle className="size-4" /> : <CheckCircle className="size-4" />}
          {hasDiscrepancy ? (severity === 'high' ? 'High Risk' : 'Medium Risk') : 'Verified'}
        </span>
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <User className="size-4" />
          Owner
        </div>
        <p className="font-medium">{props.owner_name_hi || 'N/A'}</p>
        <p className="text-sm text-muted-foreground">{props.owner_name_en}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2 p-4 border-t border-border">
        <div className="bg-accent/50 rounded-lg p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Ruler className="size-3" />
            Map Area
          </div>
          <p className="font-bold">{props.computed_area_sqm?.toFixed(0) || 'N/A'} m²</p>
        </div>
        <div className="bg-accent/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Recorded</div>
          <p className="font-bold">{props.recorded_area_sqm?.toFixed(0) || 'N/A'} m²</p>
        </div>
      </div>
      
      {hasDiscrepancy && (
        <div className={cn(
          "mx-4 mb-4 p-3 rounded-lg",
          severity === 'high' 
            ? "bg-red-100 dark:bg-red-900/20 border border-red-300"
            : "bg-amber-100 dark:bg-amber-900/20 border border-amber-300"
        )}>
          <p className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Area Mismatch: {Math.abs(props.discrepancy_percentage || 0).toFixed(1)}%
          </p>
        </div>
      )}
      
      <p className="text-xs text-center text-muted-foreground py-2 border-t border-border">
        Click elsewhere to close
      </p>
    </motion.div>
  )
}

/**
 * Legend
 */
function Legend() {
  return (
    <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 z-30 shadow-lg">
      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Layers className="size-4" />
        3D Legend
      </h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Main ThreeDMap Component
 */
export function ThreeDMap({ className }) {
  const [parcels, setParcels] = useState(null)
  const [selectedPlotId, setSelectedPlotId] = useState(null)
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cameraTarget, setCameraTarget] = useState(null)
  const [error, setError] = useState(null)
  
  // Compute center of all parcels
  const center = useMemo(() => {
    if (!parcels || !parcels.features || parcels.features.length === 0) {
      // Default to Bhinay area
      return [74.85, 26.02]
    }
    
    // Calculate centroid of all parcels
    let sumLon = 0, sumLat = 0, count = 0
    
    for (const feature of parcels.features) {
      if (!feature.geometry) continue
      
      let coords
      if (feature.geometry.type === 'Polygon') {
        coords = feature.geometry.coordinates[0]
      } else if (feature.geometry.type === 'MultiPolygon') {
        coords = feature.geometry.coordinates[0][0]
      } else {
        continue
      }
      
      const centroid = getPolygonCentroid(coords)
      sumLon += centroid[0]
      sumLat += centroid[1]
      count++
    }
    
    if (count === 0) return [74.85, 26.02]
    
    return [sumLon / count, sumLat / count]
  }, [parcels])
  
  // Load parcels
  useEffect(() => {
    async function loadParcels() {
      try {
        console.log('Loading parcels...')
        const data = await api.get('/parcels/geojson')
        console.log('Loaded parcels:', data?.features?.length || 0)
        setParcels(data)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load parcels:', err)
        setError(err.message)
        setLoading(false)
      }
    }
    loadParcels()
  }, [])
  
  // Handle search select
  const handleSearchSelect = useCallback(async (result) => {
    const plotId = result.plot_id
    if (!plotId) return
    
    console.log('Searching for plot:', plotId)
    
    try {
      const data = await api.get('/search/plot', { plot_id: plotId })
      
      if (data.found && data.parcel) {
        setSelectedPlotId(data.parcel.properties.plot_id)
        setSelectedParcel(data.parcel)
        
        // Calculate centroid for camera target
        let coords
        if (data.parcel.geometry.type === 'Polygon') {
          coords = data.parcel.geometry.coordinates[0]
        } else if (data.parcel.geometry.type === 'MultiPolygon') {
          coords = data.parcel.geometry.coordinates[0][0]
        }
        
        if (coords) {
          const centroid = getPolygonCentroid(coords)
          const scale = 111000
          setCameraTarget({
            x: (centroid[0] - center[0]) * scale,
            z: (centroid[1] - center[1]) * scale
          })
        }
      } else {
        // Try to find in loaded parcels
        const found = parcels?.features?.find(f => f.properties.plot_id === plotId)
        if (found) {
          setSelectedPlotId(plotId)
          setSelectedParcel(found)
        }
      }
    } catch (err) {
      console.error('Search failed:', err)
      // Fallback: search in loaded parcels
      const found = parcels?.features?.find(f => f.properties.plot_id === plotId)
      if (found) {
        setSelectedPlotId(plotId)
        setSelectedParcel(found)
      }
    }
  }, [center, parcels])
  
  // Handle parcel click
  const handleParcelClick = useCallback((feature) => {
    setSelectedPlotId(feature.properties.plot_id)
    setSelectedParcel(feature)
  }, [])
  
  // Handle close
  const handleClose = useCallback(() => {
    setSelectedPlotId(null)
    setSelectedParcel(null)
  }, [])
  
  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading 3D Scene...</p>
          </div>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="bg-card p-4 rounded-xl border border-destructive text-center">
            <AlertTriangle className="size-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}
      
      {/* Search */}
      <div className="absolute top-4 left-4 z-40 w-80 max-w-[calc(100%-2rem)]">
        <ParcelSearch3D onSelect={handleSearchSelect} />
      </div>
      
      {/* Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 2000, 2000], fov: 60, near: 1, far: 50000 }}
        style={{ background: '#0f172a' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0f172a')
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[200, 400, 200]} intensity={1} castShadow />
        <hemisphereLight color={0xffffff} groundColor={0x444444} intensity={0.3} />
        
        {/* Camera Controls */}
        <CameraController target={cameraTarget} zoom={500} />
        
        {/* Ground */}
        <GroundPlane />
        
        {/* Parcels */}
        {parcels && (
          <ParcelsLayer
            parcels={parcels}
            selectedPlotId={selectedPlotId}
            center={center}
            onParcelClick={handleParcelClick}
          />
        )}
        
        {/* Grid helper for debugging - larger size */}
        <gridHelper args={[50000, 200, 0x444444, 0x222222]} />
        
        {/* Debug cube at origin - RED, should always be visible */}
        <mesh position={[0, 50, 0]}>
          <boxGeometry args={[100, 100, 100]} />
          <meshStandardMaterial color={0xff0000} />
        </mesh>
        
        {/* Axes helper */}
        <axesHelper args={[500]} />
      </Canvas>
      
      {/* Info Panel */}
      <AnimatePresence>
        {selectedParcel && (
          <ParcelInfoPanel parcel={selectedParcel} onClose={handleClose} />
        )}
      </AnimatePresence>
      
      {/* Legend */}
      <Legend />
      
      {/* Debug info */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground z-30">
        Parcels: {parcels?.features?.length || 0} | 
        Center: {center[0].toFixed(4)}, {center[1].toFixed(4)}
      </div>
    </div>
  )
}

export default ThreeDMap
