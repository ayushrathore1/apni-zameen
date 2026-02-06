import { api } from './api'

/**
 * Parcels API service
 */
export const parcelsService = {
  /**
   * Get all parcels with optional filters
   */
  getAll: (params = {}) => api.get('/parcels', params),

  /**
   * Get parcel by ID
   */
  getById: (id) => api.get(`/parcels/${id}`),

  /**
   * Get parcel by plot ID (matches backend route /parcels/by-plot/{plot_id})
   */
  getByPlotId: (plotId) => api.get(`/parcels/by-plot/${encodeURIComponent(plotId)}`),

  /**
   * Get parcels as GeoJSON
   */
  getGeoJSON: (params = {}) => api.get('/parcels/geojson', params),

  /**
   * Get parcels in bounding box
   */
  getInBounds: (bounds) => api.get('/parcels/bounds', bounds),
}

/**
 * Records API service
 */
export const recordsService = {
  /**
   * Get all records with optional filters
   */
  getAll: (params = {}) => api.get('/records', params),

  /**
   * Get record by ID
   */
  getById: (id) => api.get(`/records/${id}`),

  /**
   * Get record by plot ID
   */
  getByPlotId: (plotId) => api.get(`/records/plot/${plotId}`),

  /**
   * Update record (creates new version)
   */
  update: (id, data) => api.put(`/records/${id}`, data),
}

/**
 * Discrepancies API service
 */
export const discrepanciesService = {
  /**
   * Get all discrepancies with filters
   */
  getAll: (params = {}) => api.get('/discrepancies', params),

  /**
   * Get discrepancy by ID
   */
  getById: (id) => api.get(`/discrepancies/${id}`),

  /**
   * Get discrepancy summary/stats
   */
  getSummary: () => api.get('/discrepancies/summary'),

  /**
   * Get discrepancies by village
   */
  getByVillage: (villageCode) => api.get(`/discrepancies/village/${villageCode}`),

  /**
   * Update discrepancy status
   */
  updateStatus: (id, data) => api.patch(`/discrepancies/${id}/status`, data),
}

/**
 * Search API service
 */
export const searchService = {
  /**
   * Search parcels and records
   */
  search: (query, params = {}) => api.get('/search', { q: query, ...params }),

  /**
   * Search by owner name
   */
  searchByOwner: (name) => api.get('/search/owner', { name }),

  /**
   * Search by plot ID
   */
  searchByPlotId: (plotId) => api.get('/search/plot', { plot_id: plotId }),
}

/**
 * Workflow API service
 */
export const workflowService = {
  /**
   * Transition discrepancy status
   */
  transitionStatus: (id, data) => api.post(`/workflow/transition/${id}`, data),

  /**
   * Get workflow statistics
   */
  getStats: () => api.get('/workflow/statistics'),

  /**
   * Get entity history
   */
  getHistory: (entityType, entityId) => 
    api.get(`/workflow/history/${entityType}/${entityId}`),
  
  /**
   * Get recent changes
   */
  getRecentChanges: (params = {}) => api.get('/workflow/recent', params),
}

/**
 * Villages API service
 */
export const villagesService = {
  /**
   * Get all villages
   */
  getAll: () => api.get('/villages'),
}
