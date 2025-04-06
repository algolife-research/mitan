/**
 * Lightweight utility functions for spatial operations
 */

/**
 * Determines if a point is inside a polygon
 * @param {Array} point - Point coordinates [lng, lat]
 * @param {Array} polygon - Array of polygon coordinates [[lng1, lat1], [lng2, lat2], ...]
 * @returns {boolean} True if point is inside polygon
 */
export function pointInPolygon(point, polygon) {
  // Early return if polygon is not valid
  if (!polygon || !polygon.length) return false;
  
  // Implementation of ray-casting algorithm
  const x = point[0];
  const y = point[1];
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Determines if a point is inside a GeoJSON feature
 * @param {Array} point - Point coordinates [lng, lat]
 * @param {Object} feature - GeoJSON feature
 * @returns {boolean} True if point is inside feature
 */
export function pointInFeature(point, feature) {
  if (!feature || !feature.geometry) return false;
  
  const geometry = feature.geometry;
  
  // Handle different geometry types
  switch (geometry.type) {
    case 'Polygon':
      return pointInPolygon(point, geometry.coordinates[0]);
      
    case 'MultiPolygon':
      for (const polygon of geometry.coordinates) {
        if (pointInPolygon(point, polygon[0])) return true;
      }
      return false;
      
    default:
      return false;
  }
}

/**
 * Gets the bounding box of a GeoJSON feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Array} Bounding box [minX, minY, maxX, maxY]
 */
export function getBBox(feature) {
  if (!feature || !feature.geometry) return null;
  
  const geometry = feature.geometry;
  const coords = geometry.coordinates;
  
  // Initialize bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  function updateBounds(coord) {
    if (coord[0] < minX) minX = coord[0];
    if (coord[1] < minY) minY = coord[1];
    if (coord[0] > maxX) maxX = coord[0];
    if (coord[1] > maxY) maxY = coord[1];
  }
  
  function processCoordinates(coords, depth) {
    if (depth === 0) {
      updateBounds(coords);
    } else {
      for (const coord of coords) {
        processCoordinates(coord, depth - 1);
      }
    }
  }
  
  // Process different geometry types
  switch (geometry.type) {
    case 'Point':
      updateBounds(coords);
      break;
      
    case 'LineString':
    case 'MultiPoint':
      processCoordinates(coords, 1);
      break;
      
    case 'Polygon':
    case 'MultiLineString':
      processCoordinates(coords, 2);
      break;
      
    case 'MultiPolygon':
      processCoordinates(coords, 3);
      break;
  }
  
  return [minX, minY, maxX, maxY];
}
