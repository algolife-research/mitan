import { CR_URL } from '../config/constants.js';

/**
 * Sets up the click handler for the map
 * @param {L.Map} map - The Leaflet map instance
 */
export function setupMapClickHandler(map) {
  map.on("click", function (e) {
    // Check if a popup is already open
    if (map._popup && map.hasLayer(map._popup)) {
      return; // Do nothing if a popup is already open
    }
  
    const latlng = e.latlng;
    const lat = latlng.lat;
    const lng = latlng.lng;
  
    // Initial popup content with two buttons
    let popupContent = `
      <b>Coordonnées</b><br>
      Lat : ${lat.toFixed(5)}, Lon : ${lng.toFixed(5)}<br>
      <button id="more-info-btn" style="margin-top: 5px;">Plus d'infos sur ce lieu...</button><br>
      <button id="commune-page-btn" style="margin-top: 5px;">Aller voir la page de cette commune</button>
    `;
  
    const popup = L.popup()
      .setLatLng(latlng)
      .setContent(popupContent)
      .openOn(map);
  
    // Get the buttons and attach listeners immediately
    const moreInfoButton = document.getElementById("more-info-btn");
    const communePageButton = document.getElementById("commune-page-btn");
  
    if (!moreInfoButton || !communePageButton) {
      console.error("One or both buttons not found in popup");
      return;
    }
  
    // "Plus d'infos" button listener
    moreInfoButton.addEventListener("click", async function () {
      handleMoreInfoClick(map, latlng, moreInfoButton, popup);
    });
  
    // "Aller voir la page de cette commune" button listener
    communePageButton.addEventListener("click", async function () {
      handleCommunePageClick(communePageButton, lat, lng);
    });
  });
}

/**
 * Handle click on "More Info" button
 * @param {L.Map} map - The Leaflet map instance
 * @param {L.LatLng} latlng - Click location coordinates
 * @param {HTMLElement} button - The button that was clicked
 * @param {L.Popup} popup - The popup to update
 */
async function handleMoreInfoClick(map, latlng, button, popup) {
  button.textContent = "Chargement...";
  button.disabled = true;

  const lat = latlng.lat;
  const lng = latlng.lng;
  const zoom = map.getZoom();
  const tileSize = 256;
  const point = map.project(latlng, zoom);
  const tileX = Math.floor(point.x / tileSize);
  const tileY = Math.floor(point.y / tileSize);
  const i = Math.floor(point.x) % tileSize;
  const j = Math.floor(point.y) % tileSize;

  let detailedContent = `
    <b>Coordonnées</b><br>
    Lat : ${lat.toFixed(5)}, Lon : ${lng.toFixed(5)}<br>
  `;

  const fetchWithTimeout = async (url, options, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  try {
    // 1. Get CR layer value
    try {
      const crContent = await getCRInfo(lat, lng, fetchWithTimeout);
      detailedContent += crContent;
    } catch (crError) {
      console.error("CR layer error:", crError);
      detailedContent += `<b>Perturbation</b>: Indisponible<br>`;
    }

    // 2. Get altitude
    try {
      const altitudeContent = await getAltitudeInfo(lat, lng, fetchWithTimeout);
      detailedContent += altitudeContent;
    } catch (altitudeError) {
      console.error("Altitude error:", altitudeError);
      detailedContent += `<b>Altitude</b>: Erreur de chargement<br>`;
    }

    // 3. Get forest info
    try {
      const forestContent = await getForestInfo(zoom, tileX, tileY, i, j, fetchWithTimeout);
      detailedContent += forestContent;
    } catch (forestError) {
      console.error("Forest error:", forestError);
      detailedContent += `<b>BDForêt V2</b>: Erreur de chargement<br>`;
    }

  } catch (generalError) {
    console.error("General error in More Info fetch:", generalError);
    detailedContent += `<br><b>Erreur</b>: Impossible de charger les détails`;
  } finally {
    popup.setContent(detailedContent);
    popup.update();
  }
}

/**
 * Get CR (change raster) information for location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Function} fetchWithTimeout - Fetch function with timeout
 * @returns {Promise<string>} HTML content with CR info
 */
async function getCRInfo(lat, lng, fetchWithTimeout) {
  const crResponse = await fetchWithTimeout(CR_URL, {});
  if (!crResponse.ok) throw new Error(`CR fetch failed: ${crResponse.status}`);
  const crBuffer = await crResponse.arrayBuffer();
  const georaster = await parseGeoraster(crBuffer);
  const { xmin, xmax, ymin, ymax, width, height } = georaster;

  // Handle undefined or unsupported projection
  const rasterProjection = "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"; // EPSG:2154 (Lambert-93)
  const wgs84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"; // WGS84 projection
  
  // Convert lat/lng to the same projection as the raster
  const [x, y] = proj4(wgs84, rasterProjection, [lng, lat]);

  // Convert x and y to pixel coordinates
  const xPixel = Math.floor((x - xmin) / (xmax - xmin) * width);
  const yPixel = Math.floor((ymax - y) / (ymax - ymin) * height);
  
  // Check that x and y are within the raster bounds
  if (x > xmin || x < xmax || y > ymin || y < ymax) {
    const crValue = georaster.values[0][yPixel][xPixel];
    if (crValue && crValue !== 4294967295 && !isNaN(crValue)) {
      const year = 2000 + Math.floor(crValue / 1000);
      const dayOfYear = crValue % 1000;

      // Convert day of year to month and day
      const date = new Date(year, 0); // Start from January 1st of the year
      date.setDate(dayOfYear);

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed

      // Compute the surface of the perturbation
      const visited = new Set();
      let surface = 0;

      // Fixed DFS function that only considers identical disturbance values
    function dfs(px, py) {
      const key = `${px},${py}`;
      if (px < 0 || px >= width || py < 0 || py >= height || visited.has(key)) return;
      
      const value = georaster.values[0][py][px];
      // Stop DFS if the value is NaN or 4294967295
      if (isNaN(value) || value === 4294967295) return;
      
      visited.add(key);
      surface += 1;

      // Check all 8 neighboring pixels for a more accurate surface calculation
      dfs(px + 1, py);     // Right
      dfs(px - 1, py);     // Left
      dfs(px, py + 1);     // Down
      dfs(px, py - 1);     // Up
      dfs(px + 1, py + 1); // Down-Right
      dfs(px - 1, py + 1); // Down-Left
      dfs(px + 1, py - 1); // Up-Right
      dfs(px - 1, py - 1); // Up-Left
    }

      dfs(xPixel, yPixel);

      // Convert surface from pixels to hectares (assuming 10m x 10m pixels)
      const surfaceHectares = (surface * 100) / 10000;

      return `<br><b>Perturbation</b><br>Date : ${day}-${month}-${year}<br>Surface : ${surfaceHectares.toFixed(2)} ha<br><br>`;
    }
  }
  
  return `<br><b>Perturbation</b>: Indisponible<br>`;
}

/**
 * Get altitude information for location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Function} fetchWithTimeout - Fetch function with timeout
 * @returns {Promise<string>} HTML content with altitude info
 */
async function getAltitudeInfo(lat, lng, fetchWithTimeout) {
  const altitudeUrl = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=${lng}&lat=${lat}&resource=ign_rge_alti_wld&zonly=true`;

  const altitudeResponse = await fetchWithTimeout(altitudeUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!altitudeResponse.ok) {
    const errorText = await altitudeResponse.text();
    throw new Error(`Altitude fetch failed: ${altitudeResponse.status} - ${errorText}`);
  }

  const altitudeData = await altitudeResponse.json();

  if (altitudeData && altitudeData.elevations && altitudeData.elevations.length > 0) {
    const altitude = altitudeData.elevations[0];
    return `<b>Altitude</b>: ${altitude.toFixed(1)} m<br>`;
  } else if (Array.isArray(altitudeData) && altitudeData.length > 0) {
    const altitude = altitudeData[0];
    return `<b>Altitude</b>: ${altitude.toFixed(1)} m<br>`;
  }
  
  return `<b>Altitude</b>: Non disponible<br>`;
}

/**
 * Get forest information for location
 * @param {number} zoom - Map zoom level
 * @param {number} tileX - Tile X coordinate
 * @param {number} tileY - Tile Y coordinate
 * @param {number} i - Pixel X coordinate within tile
 * @param {number} j - Pixel Y coordinate within tile
 * @param {Function} fetchWithTimeout - Fetch function with timeout
 * @returns {Promise<string>} HTML content with forest info
 */
async function getForestInfo(zoom, tileX, tileY, i, j, fetchWithTimeout) {
  const forestUrl = `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetFeatureInfo` +
                    `&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=LANDCOVER.FORESTINVENTORY.V2` +
                    `&TILEMATRIXSET=PM&TILEMATRIX=${zoom}&TILECOL=${tileX}&TILEROW=${tileY}` +
                    `&FORMAT=image/png&INFOFORMAT=text/html&I=${i}&J=${j}`;

  const forestResponse = await fetchWithTimeout(forestUrl, {});
  if (!forestResponse.ok) throw new Error(`Forest fetch failed: ${forestResponse.status}`);
  const forestHtml = await forestResponse.text();
  const cleanForestHtml = forestHtml.trim();

  if (cleanForestHtml && !cleanForestHtml.includes("ServiceExceptionReport") && cleanForestHtml.length > 30) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanForestHtml, "text/html");
    const paragraphs = doc.querySelectorAll(".geoportail-popup-content p");
    let forestData = {
      code: "Non disponible",
      formation: "Non disponible",
      generic: "Non disponible",
      essence: "Non disponible"
    };

    paragraphs.forEach(p => {
      const text = p.textContent;
      const value = p.querySelector("strong")?.textContent || "Non disponible";
      if (text.startsWith("Code :")) forestData.code = value;
      else if (text.startsWith("Type de formation végétale :")) forestData.formation = value;
      else if (text.startsWith("Type générique :")) forestData.generic = value;
      else if (text.startsWith("Essence :")) forestData.essence = value;
    });

    return `<br><b>BDForêt V2</b><br>` +
           `Code: ${forestData.code}<br>` +
           `Type de formation: ${forestData.formation}<br>` +
           `Type générique: ${forestData.generic}<br>` +
           `Essence: ${forestData.essence}<br>`;
  }
  
  return `<b>BDForêt V2</b>: Non disponible<br>`;
}

/**
 * Handle click on "See commune page" button
 * @param {HTMLElement} button - The button that was clicked
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
async function handleCommunePageClick(button, lat, lng) {
  button.textContent = "Chargement...";
  button.disabled = true;

  const fetchWithTimeout = async (url, options, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  try {
    // Fetch INSEE code using geo.api.gouv.fr
    const geocodeUrl = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}`;

    const geocodeResponse = await fetchWithTimeout(geocodeUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text();
      throw new Error(`Geocode fetch failed: ${geocodeResponse.status} - ${errorText}`);
    }

    const geocodeData = await geocodeResponse.json();

    // Extract INSEE code from the first commune in the response
    const inseeCode = geocodeData[0]?.code || "unknown";
    if (inseeCode === "unknown") {
      throw new Error("No INSEE code found in response");
    }

    // Redirect to the commune page
    const communeUrl = `carte.html?commune=${inseeCode}`;
    window.location.href = communeUrl;

  } catch (error) {
    console.error("Error fetching INSEE code:", error);
    alert("Erreur lors de la récupération du code INSEE.");
    button.textContent = "Voir la page de cette commune";
    button.disabled = false;
  }
}
