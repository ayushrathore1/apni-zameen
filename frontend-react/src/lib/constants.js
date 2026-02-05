// API Base URL - Uses environment variable in production, /api (proxy) in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// User Roles
export const ROLES = {
  PUBLIC: 'PUBLIC',
  OFFICIAL: 'OFFICIAL',
  ADMIN: 'ADMIN',
}

// Discrepancy Types (for filter dropdowns)
export const DISCREPANCY_TYPES = [
  { value: 'area_mismatch', label: { en: 'Area Mismatch', hi: 'क्षेत्र बेमेल' } },
  { value: 'owner_mismatch', label: { en: 'Owner Mismatch', hi: 'मालिक बेमेल' } },
  { value: 'boundary_overlap', label: { en: 'Boundary Overlap', hi: 'सीमा ओवरलैप' } },
  { value: 'missing_record', label: { en: 'Missing Record', hi: 'गायब रिकॉर्ड' } },
  { value: 'orphan_parcel', label: { en: 'Orphan Parcel', hi: 'अनाथ पार्सल' } },
]

// Discrepancy Statuses (for filter dropdowns)
export const DISCREPANCY_STATUSES = [
  { value: 'open', label: { en: 'Open', hi: 'खुला' } },
  { value: 'under_review', label: { en: 'Under Review', hi: 'समीक्षाधीन' } },
  { value: 'resolved', label: { en: 'Resolved', hi: 'हल किया' } },
  { value: 'disputed', label: { en: 'Disputed', hi: 'विवादित' } },
  { value: 'ignored', label: { en: 'Ignored', hi: 'उपेक्षित' } },
]

// Severity Levels
export const SEVERITY = {
  MINOR: 'minor',
  MAJOR: 'major',
  CRITICAL: 'critical',
}

// Status Labels (bilingual)
export const STATUS_LABELS = {
  open: { en: 'Open', hi: 'खुला' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  resolved: { en: 'Resolved', hi: 'हल किया' },
  disputed: { en: 'Disputed', hi: 'विवादित' },
  ignored: { en: 'Ignored', hi: 'उपेक्षित' },
}

// Severity Labels (bilingual)
export const SEVERITY_LABELS = {
  minor: { en: 'Minor', hi: 'मामूली' },
  major: { en: 'Major', hi: 'प्रमुख' },
  critical: { en: 'Critical', hi: 'गंभीर' },
}

// Map Configuration
export const MAP_CONFIG = {
  // India center coordinates
  indiaCenter: [20.5937, 78.9629],
  indiaZoom: 5,
  // Bhinay Block, Ajmer - project area
  defaultCenter: [26.02, 74.85],
  defaultZoom: 5,  // Start from India view
  dataZoom: 14,     // Zoom level when viewing data
  minZoom: 4,
  maxZoom: 18,
  // Default to satellite for land parcel visualization
  defaultLayer: 'satellite',
}

// Free Tile Layer Providers
export const TILE_LAYERS = {
  satellite: {
    name: 'Satellite',
    nameHi: 'उपग्रह',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
  street: {
    name: 'Street Map',
    nameHi: 'सड़क नक्शा',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  light: {
    name: 'Light',
    nameHi: 'हल्का',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  dark: {
    name: 'Dark',
    nameHi: 'गहरा',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  topo: {
    name: 'Topographic',
    nameHi: 'स्थलाकृतिक',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  hybrid: {
    name: 'Hybrid',
    nameHi: 'हाइब्रिड',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 19,
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
}

// Parcel Colors for map
export const PARCEL_COLORS = {
  default: '#3B82F6',
  matched: '#22C55E',
  needs_review: '#F59E0B',
  critical: '#EF4444',
  hover: '#1D4ED8',
  selected: '#6366F1',
}

// Navigation Links
export const NAV_LINKS = {
  citizen: [
    { path: '/', label: { en: 'Home', hi: 'होम' }, icon: 'Home' },
    { path: '/map', label: { en: 'Map', hi: 'नक्शा' }, icon: 'Map' },
    { path: '/search', label: { en: 'Search', hi: 'खोजें' }, icon: 'Search' },
  ],
  official: [
    { path: '/dashboard', label: { en: 'Dashboard', hi: 'डैशबोर्ड' }, icon: 'LayoutDashboard' },
    { path: '/map', label: { en: 'Map', hi: 'नक्शा' }, icon: 'Map' },
    { path: '/discrepancies', label: { en: 'Discrepancies', hi: 'विसंगतियाँ' }, icon: 'AlertTriangle' },
    { path: '/records', label: { en: 'Records', hi: 'अभिलेख' }, icon: 'FileText' },
    { path: '/reports', label: { en: 'Reports', hi: 'रिपोर्ट' }, icon: 'BarChart3' },
  ],
}

