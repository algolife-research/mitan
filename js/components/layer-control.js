import { BASE_LAYERS } from '../config/map-config.js';

/**
 * Initializes the layer control with base and overlay layers
 * @param {L.Map} map - The Leaflet map instance
 * @returns {L.Control.Layers} The initialized layer control
 */
export function initializeLayerControl(map) {
  // Create base layers
  const forestLayer = L.tileLayer(
    'https://data.geopf.fr/wmts?layer=LANDCOVER.FORESTINVENTORY.V2&style=LANDCOVER.FORESTINVENTORY.V2&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
    {
      tileSize: 256,
      pane: "pane2",
      opacity: 0.3,
      minZoom: 0,
      maxZoom: 18,
    }
  ).addTo(map);
  
  const hydroLayer = L.tileLayer(
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&LAYER=HYDROGRAPHY.HYDROGRAPHY&FORMAT=image/png&STYLE=normal&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}',
    {
      minZoom: 0,
      maxZoom: 18,
      tileSize: 256,
      opacity: 0.9
    }
  ).addTo(map);
  
  const cadastreLayer = L.tileLayer(
    'https://data.geopf.fr/wmts?layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&style=PCI vecteur&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
    {
      tileSize: 256,
      minZoom: 0,
      maxZoom: 20,
    }
  );
  
  // Create the layer control
  const layerControl = L.control.layers(null, {
    '<span style="display:inline-block; width:12px; height:12px; background-color:rgba(34,139,34,0.3); margin-right:6px; border:1px solid #555;"></span>BDForêt V2': forestLayer,
    '<span style="display:inline-block; width:12px; height:12px; background-color:lightblue; margin-right:6px; border:1px solid #555;"></span>Hydrographie': hydroLayer,
    '<span style="display:inline-block; width:12px; height:12px; background-color:rgba(199, 129, 23, 0.85); margin-right:6px; border:1px solid #555;"></span>Cadastre': cadastreLayer,
  }, { 
    collapsed: false, 
    position: 'topleft'
  }).addTo(map);
  
  // Style the layer control
  const layerControlContainer = layerControl.getContainer();
  layerControlContainer.classList.add("modern-layer-control");
  
  // Tag checkboxes with data attributes to identify them later
  const checkboxes = layerControlContainer.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    checkbox.dataset.layerid = `layer-${index}`;
  });
  
  return layerControl;
}

/**
 * Creates a tile layer from the given URL and options
 * @param {string} url - The tile layer URL
 * @param {Object} options - Layer options
 * @returns {L.TileLayer} The created tile layer
 */
function createTileLayer(url, options) {
  return L.tileLayer(url, options);
}

/**
 * Loads additional layers from the configuration file
 * @param {L.Control.Layers} layerControl - The layer control to add layers to
 * @param {Object} bounds - Bounding box for the layers
 */
export function loadConfiguredLayers(layerControl, bounds) {
  const bboxGeoJSON = {
    type: "Polygon",
    coordinates: [[
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()],
      [bounds.getWest(), bounds.getNorth()],
      [bounds.getWest(), bounds.getSouth()]
    ]]
  };

  const geomParam = encodeURIComponent(JSON.stringify(bboxGeoJSON));

  // Fetch and process layers configuration
  fetch('/layersConfig.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des données : ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(layersConfig => {
      const fetchPromises = layersConfig.map(config =>
        fetchAndAddLayer(config.url, config.style, config.label, layerControl, geomParam)
      );

      // Apply styles to layer indicators from config
      layersConfig.forEach(layer => {
        const className = layer.label.match(/class="([^"]+)"/)?.[1];
        if (className) {
          const style = document.createElement('style');
          style.textContent = `
            .${className} {
              background-color: ${layer.style.fillColor} !important;
              border-color: ${layer.style.color} !important;
            }
          `;
          document.head.appendChild(style);
        }
      });

      return Promise.all(fetchPromises);
    })
    .catch(err => console.error("Erreur lors du chargement de la configuration des couches :", err));
}

/**
 * Fetches and adds a layer to the map
 * @param {string} url - URL to fetch GeoJSON data
 * @param {Object} style - Style for the layer
 * @param {string} label - Label for the layer in the control
 * @param {L.Control.Layers} layerControl - Layer control to add the layer to
 * @param {string} geomParam - Geometry parameter for URL
 */
async function fetchAndAddLayer(url, style, label, layerControl, geomParam) {
  try {
    // Replace ${geomParam} placeholder in URL with actual value
    url = url.replace('${geomParam}', geomParam);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors de la récupération des données.");
    const layerData = await response.json();
    const layer = L.geoJSON(layerData, {
      style: style,
      pane: "pane1"
    });
    layerControl.addOverlay(layer, label);
  } catch (err) {
    console.error(err);
  }
}
