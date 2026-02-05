import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, MapPin, User, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

/**
 * ParcelSearch - Search parcels by Plot ID or Owner Name with auto-zoom
 */
export function ParcelSearch({ onParcelSelect, onLocationSelect, className }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Debounced search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await api.get('/search/', { q: searchQuery, limit: 15 })
      setResults(response.results || [])
      setIsOpen(true)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, performSearch])

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle result selection
  const handleSelect = async (result) => {
    setIsOpen(false)
    setSelectedIndex(-1)
    setQuery(result.plot_id || result.owner_name_hindi || '')

    // If we have coordinates, zoom to location
    if (result.centroid_lat && result.centroid_lon) {
      onLocationSelect?.([result.centroid_lat, result.centroid_lon], 18)
    }

    // Fetch full parcel data if we have a plot_id
    if (result.plot_id) {
      try {
        const parcelData = await api.get('/search/plot', { plot_id: result.plot_id })
        if (parcelData.found && parcelData.parcel) {
          onParcelSelect?.(parcelData.parcel)
          
          // If we didn't have centroid from search, get from parcel geometry
          if (!result.centroid_lat && parcelData.parcel.geometry) {
            const coords = parcelData.parcel.geometry.coordinates[0]
            if (coords && coords.length > 0) {
              // Calculate center of polygon
              const lats = coords.map(c => c[1])
              const lons = coords.map(c => c[0])
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
              const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2
              onLocationSelect?.([centerLat, centerLon], 18)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch parcel:', error)
      }
    }
  }

  // Clear search
  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search by Plot ID or Owner Name..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-lg"
        />
        
        {/* Loading / Clear Button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="size-4 text-muted-foreground animate-spin" />
          ) : query.length > 0 ? (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={cn(
                  'w-full px-4 py-3 flex items-start gap-3 text-left transition-colors border-b border-border last:border-0',
                  selectedIndex === index
                    ? 'bg-primary/10'
                    : 'hover:bg-accent'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'size-8 rounded-full flex items-center justify-center flex-shrink-0',
                  result.type === 'parcel' 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                )}>
                  {result.type === 'parcel' ? (
                    <MapPin className="size-4" />
                  ) : (
                    <User className="size-4" />
                  )}
                </div>
                
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {result.type === 'parcel' ? (
                      result.plot_id
                    ) : (
                      <>
                        {result.owner_name_hindi}
                        {result.owner_name_english && (
                          <span className="text-muted-foreground ml-2">
                            ({result.owner_name_english})
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {result.type === 'parcel' ? (
                      <>
                        {result.village_name} 
                        {result.computed_area_sqm && (
                          <span className="ml-2">
                            • {Math.round(result.computed_area_sqm)} m²
                          </span>
                        )}
                      </>
                    ) : (
                      <>Plot: {result.plot_id}</>
                    )}
                  </p>
                </div>

                {/* Score badge */}
                <div className="flex-shrink-0">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    result.match_score >= 90 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {result.match_field === 'plot_id' ? 'Plot' : 'Owner'}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results Message */}
      <AnimatePresence>
        {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-4 text-center text-muted-foreground"
          >
            No parcels found for "{query}"
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
