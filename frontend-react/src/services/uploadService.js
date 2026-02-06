/**
 * Upload Service - API client for file upload endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Helper to handle API responses
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `Request failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Upload a CSV file containing land records
 * @param {File} file - The CSV file
 * @param {boolean} seedImmediately - Whether to seed data immediately
 * @returns {Promise<Object>} Upload response with job_id and preview
 */
export async function uploadCSV(file, seedImmediately = false) {
  const formData = new FormData()
  formData.append('file', file)
  
  const url = `${API_BASE}/upload/csv?seed_immediately=${seedImmediately}`
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  
  return handleResponse(response)
}

/**
 * Upload a GeoJSON file containing parcel geometries
 * @param {File} file - The GeoJSON file
 * @param {boolean} seedImmediately - Whether to seed data immediately
 * @returns {Promise<Object>} Upload response with job_id and preview
 */
export async function uploadGeoJSON(file, seedImmediately = false) {
  const formData = new FormData()
  formData.append('file', file)
  
  const url = `${API_BASE}/upload/geojson?seed_immediately=${seedImmediately}`
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  
  return handleResponse(response)
}

/**
 * Upload a Nakal document (image or PDF) for OCR processing
 * @param {File} file - The image or PDF file
 * @param {boolean} seedImmediately - Whether to seed data immediately
 * @returns {Promise<Object>} Upload response with extracted data
 */
export async function uploadNakal(file, seedImmediately = false) {
  const formData = new FormData()
  formData.append('file', file)
  
  const url = `${API_BASE}/upload/nakal?seed_immediately=${seedImmediately}`
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  
  return handleResponse(response)
}

/**
 * Seed data from a previous upload job
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} Seeding result
 */
export async function seedJobData(jobId) {
  const response = await fetch(`${API_BASE}/upload/seed/${jobId}`, {
    method: 'POST',
  })
  
  return handleResponse(response)
}

/**
 * Get the status of an upload job
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} Job status
 */
export async function getJobStatus(jobId) {
  const response = await fetch(`${API_BASE}/upload/status/${jobId}`)
  return handleResponse(response)
}

/**
 * List recent upload jobs
 * @param {number} limit - Max number of jobs to return
 * @returns {Promise<Object>} List of recent jobs
 */
export async function listJobs(limit = 20) {
  const response = await fetch(`${API_BASE}/upload/jobs?limit=${limit}`)
  return handleResponse(response)
}

export const uploadService = {
  uploadCSV,
  uploadGeoJSON,
  uploadNakal,
  seedJobData,
  getJobStatus,
  listJobs,
}
