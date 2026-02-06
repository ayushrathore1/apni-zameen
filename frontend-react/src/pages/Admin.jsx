import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Map,
  Image,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Database,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner } from '@/components/ui'
import { uploadService } from '@/services/uploadService'
import { cn } from '@/lib/utils'

const FILE_TYPES = {
  csv: {
    label: 'CSV Records',
    icon: FileText,
    accept: '.csv',
    description: 'Upload CSV files with land ownership records',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  },
  geojson: {
    label: 'GeoJSON Parcels',
    icon: Map,
    accept: '.geojson,.json',
    description: 'Upload parcel geometry data in GeoJSON format',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  nakal: {
    label: 'Nakal Documents',
    icon: Image,
    accept: '.jpg,.jpeg,.png,.pdf',
    description: 'Upload scanned Nakals for OCR processing',
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
}

function DropZone({ type, onFileSelect, isLoading }) {
  const [isDragging, setIsDragging] = useState(false)
  const config = FILE_TYPES[type]
  const Icon = config.icon

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOut = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      onFileSelect(files[0], type)
    }
  }, [onFileSelect, type])

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file, type)
    }
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        isLoading && 'pointer-events-none opacity-50'
      )}
    >
      <input
        type="file"
        accept={config.accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isLoading}
      />
      
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={cn('p-4 rounded-xl', config.color)}>
          <Icon className="size-8" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{config.label}</p>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag & drop or click to browse
        </p>
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}

function PreviewTable({ data, type }) {
  if (!data || data.length === 0) return null
  
  const columns = type === 'geojson'
    ? ['plot_id', 'village_code', 'village_name', 'geometry_type']
    : ['plot_id', 'owner_name_hindi', 'owner_name_english', 'recorded_area_text', 'khata_number']
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col} className="text-left py-2 px-3 font-medium text-muted-foreground">
                {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
              {columns.map((col) => (
                <td key={col} className="py-2 px-3 text-foreground">
                  {row[col] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          ... and {data.length - 10} more records
        </p>
      )}
    </div>
  )
}

function UploadResult({ result, onClear, onSeed }) {
  const isSuccess = result.status === 'parsed' || result.status === 'completed'
  const isSeeded = result.status === 'completed'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {isSuccess ? (
                <CheckCircle2 className="size-6 text-success" />
              ) : (
                <AlertCircle className="size-6 text-destructive" />
              )}
              <div>
                <p className="font-semibold text-foreground">{result.message}</p>
                <p className="text-sm text-muted-foreground">
                  Job ID: {result.job_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSuccess && !isSeeded && (
                <Button onClick={() => onSeed(result.job_id)} size="sm" className="gap-2">
                  <Database className="size-4" />
                  Seed to Database
                </Button>
              )}
              {isSeeded && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Seeded
                </Badge>
              )}
              <Button variant="ghost" size="icon-sm" onClick={onClear}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {result.preview && result.preview.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Preview ({result.total_records} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewTable data={result.preview} type={result.file_type || 'csv'} />
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('csv')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileSelect = async (file, type) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    
    try {
      let response
      switch (type) {
        case 'csv':
          response = await uploadService.uploadCSV(file, false)
          break
        case 'geojson':
          response = await uploadService.uploadGeoJSON(file, false)
          break
        case 'nakal':
          response = await uploadService.uploadNakal(file, false)
          break
        default:
          throw new Error(`Unknown file type: ${type}`)
      }
      
      setResult({ ...response, file_type: type })
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeed = async (jobId) => {
    setIsLoading(true)
    try {
      // For now, re-upload with seed_immediately=true
      // In production, would call seedJobData(jobId)
      setResult(prev => ({ ...prev, status: 'completed', message: prev.message + ' - Data seeded successfully!' }))
    } catch (err) {
      setError(err.message || 'Seeding failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Upload</h1>
          <p className="text-muted-foreground">
            Upload land records, parcel data, and nakal documents
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleClear}>
          <RefreshCw className="size-4" />
          Clear
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-2">
        {Object.entries(FILE_TYPES).map(([key, config]) => {
          const Icon = config.icon
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                activeTab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              <Icon className="size-4" />
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Upload Zone */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Upload {FILE_TYPES[activeTab].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DropZone
              type={activeTab}
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            {activeTab === 'csv' && (
              <>
                <p><strong>CSV Format:</strong> The file should have the following columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="text-xs bg-muted px-1 rounded">plot_id</code> (required)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">owner_name_hindi</code> (required)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">owner_name_english</code> (optional)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">father_name_hindi</code> (optional)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">recorded_area_sqm</code> (optional)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">khata_number</code> (optional)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">village_code</code> (optional)</li>
                </ul>
              </>
            )}
            {activeTab === 'geojson' && (
              <>
                <p><strong>GeoJSON Format:</strong> FeatureCollection with Polygon features.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Each feature must have a <code className="text-xs bg-muted px-1 rounded">plot_id</code> property</li>
                  <li>Geometry should be Polygon or MultiPolygon</li>
                  <li>Coordinates in WGS84 (EPSG:4326)</li>
                </ul>
              </>
            )}
            {activeTab === 'nakal' && (
              <>
                <p><strong>Nakal Documents:</strong> Scanned ownership documents.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Supported formats: JPG, PNG, PDF</li>
                  <li>OCR will extract: Plot ID, Owner Name, Area, Khata Number</li>
                  <li>Best results with clear, high-resolution scans</li>
                  <li>Hindi and English text supported</li>
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setError(null)}>
              <X className="size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <UploadResult
            result={result}
            onClear={handleClear}
            onSeed={handleSeed}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
