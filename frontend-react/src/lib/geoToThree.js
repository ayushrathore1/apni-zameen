/**
 * geoToThree.js
 * 
 * Utility module for converting GeoJSON polygons to Three.js shapes.
 * Handles coordinate projection from WGS84 (EPSG:4326) to Web Mercator (EPSG:3857).
 */

import * as THREE from 'three'
import proj4 from 'proj4'
import * as turf from '@turf/turf'

// Define projections
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs')
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs')

/**
 * Project a single coordinate from WGS84 to Web Mercator
 * @param {[number, number]} coord - [longitude, latitude]
 * @returns {[number, number]} - [x, y] in meters
 */
export function projectCoordinate(coord) {
  return proj4('EPSG:4326', 'EPSG:3857', coord)
}

/**
 * Project an array of coordinates from WGS84 to Web Mercator
 * @param {Array<[number, number]>} coords - Array of [longitude, latitude]
 * @returns {Array<[number, number]>} - Array of [x, y] in meters
 */
export function projectCoordinates(coords) {
  return coords.map(coord => projectCoordinate(coord))
}

/**
 * Convert a GeoJSON Polygon to a Three.js Shape
 * @param {Object} geometry - GeoJSON geometry object (Polygon or MultiPolygon)
 * @param {[number, number]} centerOffset - Center offset to normalize coordinates [x, y]
 * @returns {THREE.Shape} - Three.js Shape object
 */
export function geoJsonToThreeShape(geometry, centerOffset = [0, 0]) {
  if (!geometry) return null
  
  let coordinates
  
  if (geometry.type === 'Polygon') {
    coordinates = geometry.coordinates[0] // Outer ring
  } else if (geometry.type === 'MultiPolygon') {
    coordinates = geometry.coordinates[0][0] // First polygon, outer ring
  } else {
    console.warn('Unsupported geometry type:', geometry.type)
    return null
  }
  
  // Project coordinates to Web Mercator
  const projected = projectCoordinates(coordinates)
  
  // Normalize to center (subtract center offset for local coordinates)
  const normalized = projected.map(([x, y]) => [
    x - centerOffset[0],
    y - centerOffset[1]
  ])
  
  // Create Three.js Shape
  const shape = new THREE.Shape()
  
  normalized.forEach(([x, y], i) => {
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  })
  
  // Close the shape
  shape.closePath()
  
  return shape
}

/**
 * Compute the centroid of a GeoJSON feature
 * @param {Object} feature - GeoJSON Feature
 * @returns {{lon: number, lat: number, x: number, y: number}} - Centroid in both coordinate systems
 */
export function computeCentroid(feature) {
  if (!feature || !feature.geometry) return null
  
  try {
    const centroid = turf.centroid(feature)
    const [lon, lat] = centroid.geometry.coordinates
    const [x, y] = projectCoordinate([lon, lat])
    
    return { lon, lat, x, y }
  } catch (e) {
    console.error('Error computing centroid:', e)
    return null
  }
}

/**
 * Compute the area of a GeoJSON feature in square meters
 * @param {Object} feature - GeoJSON Feature
 * @returns {number} - Area in square meters
 */
export function computeArea(feature) {
  if (!feature || !feature.geometry) return 0
  
  try {
    return turf.area(feature)
  } catch (e) {
    console.error('Error computing area:', e)
    return 0
  }
}

/**
 * Get bounding box of a GeoJSON feature
 * @param {Object} feature - GeoJSON Feature
 * @returns {{minLon: number, minLat: number, maxLon: number, maxLat: number}} - Bounding box
 */
export function getBoundingBox(feature) {
  if (!feature || !feature.geometry) return null
  
  try {
    const bbox = turf.bbox(feature)
    return {
      minLon: bbox[0],
      minLat: bbox[1],
      maxLon: bbox[2],
      maxLat: bbox[3]
    }
  } catch (e) {
    console.error('Error computing bounding box:', e)
    return null
  }
}

/**
 * Create an extruded mesh from a GeoJSON feature
 * @param {Object} feature - GeoJSON Feature
 * @param {Object} options - Extrusion options
 * @param {number} options.height - Extrusion height (default: 50)
 * @param {number} options.color - Mesh color (default: 0x2563eb blue)
 * @param {number} options.opacity - Mesh opacity (default: 0.7)
 * @param {[number, number]} options.centerOffset - Center offset for normalization
 * @returns {THREE.Mesh} - Extruded mesh
 */
export function createExtrudedMesh(feature, options = {}) {
  const {
    height = 50,
    color = 0x2563eb,
    opacity = 0.7,
    centerOffset = [0, 0]
  } = options
  
  if (!feature || !feature.geometry) return null
  
  const shape = geoJsonToThreeShape(feature.geometry, centerOffset)
  if (!shape) return null
  
  // Create extruded geometry
  const extrudeSettings = {
    depth: height,
    bevelEnabled: false
  }
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  
  // Rotate to lay flat on XZ plane (Three.js Y is up)
  geometry.rotateX(-Math.PI / 2)
  
  // Create material
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  
  return mesh
}

/**
 * Create edge lines for a polygon (for border effect)
 * @param {Object} feature - GeoJSON Feature
 * @param {Object} options - Line options
 * @returns {THREE.LineSegments} - Line segments for edges
 */
export function createPolygonEdges(feature, options = {}) {
  const {
    color = 0x1d4ed8,
    lineWidth = 2,
    height = 50,
    centerOffset = [0, 0]
  } = options
  
  if (!feature || !feature.geometry) return null
  
  const shape = geoJsonToThreeShape(feature.geometry, centerOffset)
  if (!shape) return null
  
  // Create extruded geometry
  const extrudeSettings = {
    depth: height,
    bevelEnabled: false
  }
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geometry.rotateX(-Math.PI / 2)
  
  // Create edges
  const edgesGeometry = new THREE.EdgesGeometry(geometry)
  const material = new THREE.LineBasicMaterial({ 
    color,
    linewidth: lineWidth
  })
  
  return new THREE.LineSegments(edgesGeometry, material)
}

/**
 * Convert lat/lon to local scene coordinates
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @param {[number, number]} centerOffset - Scene center in Web Mercator
 * @param {number} scale - Scale factor (default: 1)
 * @returns {{x: number, y: number, z: number}} - Scene coordinates
 */
export function latLonToSceneCoords(lon, lat, centerOffset, scale = 1) {
  const [x, y] = projectCoordinate([lon, lat])
  return {
    x: (x - centerOffset[0]) * scale,
    y: 0, // Ground level
    z: -(y - centerOffset[1]) * scale // Flip Z for Three.js
  }
}
