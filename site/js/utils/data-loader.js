import { GEOJSON_URL, URL_COMMUNE_CODE } from '../config/constants.js';

/**
 * Loads commune data from the API
 * @returns {Promise<Object>} The loaded commune data
 */
export async function loadCommuneData() {
  if (!URL_COMMUNE_CODE) {
    console.warn("No commune code in URL");
    return null;
  }
  
  try {
    // Load commune information
    const communeResult = await fetch(`https://geo.api.gouv.fr/communes?code=${URL_COMMUNE_CODE}&fields=nom&format=json`);
    const communeData = await communeResult.json();
    
    if (!communeData || !communeData.length) {
      console.warn("No commune data found");
      return null;
    }
    
    // Set page title to commune name
    document.title = communeData[0].nom;
    
    // Load commune geometry
    const geoResult = await fetch(GEOJSON_URL);
    const geoData = await geoResult.json();
    
    return {
      info: communeData[0],
      geometry: geoData
    };
  } catch (error) {
    console.error("Error loading commune data:", error);
    return null;
  }
}

/**
 * Loads a GeoJSON file
 * @param {string} url - URL to the GeoJSON file
 * @returns {Promise<Object>} The loaded GeoJSON data
 */
export async function loadGeoJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON from ${url}: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
    throw error;
  }
}
