import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, X, Cuboid, Map as MapIcon } from 'lucide-react'
import { LandMap, Map3D, ThreeDMap } from '@/components/map'
import { Button, Input, Select, Badge, Spinner } from '@/components/ui'
import { parcelsService, villagesService } from '@/services/parcels'
import { cn } from '@/lib/utils'

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State
  const [parcels, setParcels] = useState([])
  const [villages, setVillages] = useState([])
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedVillage, setSelectedVillage] = useState(searchParams.get('village') || '')
  const [showFilters, setShowFilters] = useState(false)
  
  // View mode: '2d' or '3d'
  const [viewMode, setViewMode] = useState('3d')
  
  // Fly-to state
  const [flyToCenter, setFlyToCenter] = useState(null)
  const [flyToZoom, setFlyToZoom] = useState(null)

  // Fetch villages
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const data = await villagesService.getAll()
        setVillages(data.villages || [])
      } catch (err) {
        console.error('Failed to fetch villages:', err)
      }
    }
    fetchVillages()
  }, [])

  // Fetch parcels
  useEffect(() => {
    const fetchParcels = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const params = {}
        if (selectedVillage) params.village_code = selectedVillage
        
        const data = await parcelsService.getGeoJSON(params)
        setParcels(data)
      } catch (err) {
        console.error('Failed to fetch parcels:', err)
        setError('Failed to load parcels. Please try again.')
        // Set demo data for development
        setParcels({
          type: 'FeatureCollection',
          features: [],
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchParcels()
  }, [selectedVillage])

  // Handle parcel selection
  const handleParcelSelect = useCallback((parcel) => {
    setSelectedParcel(parcel)
    
    // Update URL
    if (parcel?.properties?.plot_id) {
      setSearchParams({ plot: parcel.properties.plot_id })
    }
  }, [setSearchParams])

  // Handle parcel close
  const handleParcelClose = useCallback(() => {
    setSelectedParcel(null)
    setSearchParams({})
  }, [setSearchParams])

  // Handle search
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return
    
    try {
      // Search by plot ID or owner name
      const results = await parcelsService.getByPlotId(searchQuery)
      if (results) {
        // Find the parcel and fly to it
        const parcel = parcels.features?.find(
          f => f.properties?.plot_id === searchQuery
        )
        if (parcel && parcel.geometry) {
          const coords = getCentroid(parcel.geometry)
          setFlyToCenter(coords)
          setFlyToZoom(17)
          setSelectedParcel(parcel)
        }
      }
    } catch (err) {
      console.error('Search failed:', err)
    }
  }, [searchQuery, parcels])

  // Handle village filter
  const handleVillageChange = useCallback((e) => {
    const village = e.target.value
    setSelectedVillage(village)
    setSearchParams(village ? { village } : {})
  }, [setSearchParams])

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Search Bar */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="container mx-auto flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Plot ID or Owner Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          
          <div className="flex gap-2">
            <Select
              id="village-filter"
              value={selectedVillage}
              onChange={handleVillageChange}
              options={[
                { value: '', label: 'All Villages' },
                ...villages.map(v => ({ value: v.code, label: v.name })),
              ]}
              className="w-40"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-secondary')}
            >
              <Filter className="size-4" />
            </Button>
            
            {/* 2D/3D Toggle */}
            <Button
              variant={viewMode === '3d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
              className="gap-2"
            >
              {viewMode === '3d' ? (
                <><Cuboid className="size-4" />3D</>  
              ) : (
                <><MapIcon className="size-4" />2D</>
              )}
            </Button>
          </div>
        </div>
        
        {/* Extended Filters */}
        {showFilters && (
          <div className="container mx-auto mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
              All Statuses
            </Badge>
            <Badge variant="status-open" className="cursor-pointer">
              Open Issues
            </Badge>
            <Badge variant="status-review" className="cursor-pointer">
              Under Review
            </Badge>
            <Badge variant="status-resolved" className="cursor-pointer">
              Resolved
            </Badge>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive-light text-destructive px-4 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setError(null)}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {viewMode === '3d' ? (
          <Map3D className="w-full h-full" />
        ) : (
          <LandMap
            parcels={parcels}
            selectedParcel={selectedParcel}
            onParcelSelect={handleParcelSelect}
            onParcelClose={handleParcelClose}
            flyToCenter={flyToCenter}
            flyToZoom={flyToZoom}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

// Helper to get centroid of geometry
function getCentroid(geometry) {
  if (!geometry) return null
  
  if (geometry.type === 'Point') {
    return [geometry.coordinates[1], geometry.coordinates[0]]
  }
  
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0]
    let lat = 0, lng = 0
    coords.forEach(c => {
      lng += c[0]
      lat += c[1]
    })
    return [lat / coords.length, lng / coords.length]
  }
  
  return null
}
