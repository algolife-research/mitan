import { setupMap } from './config/map-config.js';
import { initializeSearch } from './components/search.js';
import { initializeForetScore } from './components/foret-score.js';
import { initializeLayerControl, loadConfiguredLayers } from './components/layer-control.js';
import { initializeInfoControls } from './components/info-controls.js';
import { setupMapClickHandler } from './handlers/map-click.js';
import { initializeCRData } from './handlers/chart-interaction.js';
import { loadCommuneData, loadGeoJSON } from './utils/data-loader.js';
import { GEOJSON_URL, URL_COMMUNE_CODE } from './config/constants.js';

/**
 * Main application initialization
 */
document.addEventListener("DOMContentLoaded", async function() {
  try {
    // Create map instance
    const map = setupMap('map');
    
    // Load commune data first to get name for title
    const communeData = await loadCommuneData();
    
    // Update page title with commune name
    if (communeData && communeData.info && communeData.info.nom) {
      document.title = communeData.info.nom;
      
      // Store commune name for other components to use
      window.communeName = communeData.info.nom;
    }
    
    // Create map panes for layer stacking
    ['pane1', 'pane2', 'pane3', 'pane4'].forEach((pane, index) => {
      map.createPane(pane);
      map.getPane(pane).style.zIndex = 400 + (index * 100);
    });
    
    // Initialize sidebar components directly
    setupSidebarComponents(map);
    
    // Setup event handlers
    setupMapClickHandler(map);
    
    // Load commune geometry and add to map
    const aoiData = await loadGeoJSON(GEOJSON_URL);
    const aoiLayer = L.geoJSON(aoiData, {
      style: {
        color: '#ffffff',
        weight: 2.5,
        fillOpacity: 0
      },
      pane: "pane1"
    }).addTo(map);
    
    // Fit map to commune boundaries
    map.fitBounds(aoiLayer.getBounds());
    
    // Load and initialize dynamic layers
    const layerControl = createLayerControl(map);
    const bounds = aoiLayer.getBounds();
    await loadAllLayers(map, layerControl, bounds);
    initializeCRData(map, layerControl);
    
    console.log('Map application initialized successfully');
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});

/**
 * Sets up all sidebar components
 * @param {L.Map} map - The Leaflet map instance
 */
function setupSidebarComponents(map) {
  // Initialize search section
  const searchSection = document.getElementById('search-section');
  if (searchSection) {
    searchSection.innerHTML = `
      <h3>Rechercher</h3>
      <input type="text" id="searchInput" placeholder="Rechercher un lieu..." />
      <div id="autocompleteList" class="autocomplete-list"></div>
    `;
    
    // Initialize search component
    const searchInput = document.getElementById('searchInput');
    const autocompleteList = document.getElementById('autocompleteList');
    if (searchInput && autocompleteList) {
      initializeSearchFunction(searchInput, autocompleteList, map);
    }
  }
  
  // Initialize forêt score section
  const foretScoreSection = document.getElementById('foret-score-section');
  if (foretScoreSection) {
    foretScoreSection.innerHTML = `
      <h3 id="foret-score-title">${window.communeName || ''}</h3>
      <div class="foret-score-container">
        <div class="image-column">
          <img id="foret-score-img" alt="Forêt Score" />
        </div>
        <div class="text-column">
          <div id="foret-score-details"></div>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="areaChart"></canvas>
      </div>
    `;
    
    // Load and display Forêt Score data
    loadForetScoreData();
  }
  
  // Initialize the base layers section
  const layersContent = document.getElementById('layers-content');
  if (layersContent) {
    // Create containers for base and dynamic layers
    layersContent.innerHTML = `
      <div id="base-layers-container">
        <h4>Couches de base</h4>
        <div id="base-layers"></div>
      </div>
      <div id="dynamic-layers-container">
        <h4>Zones protégées</h4>
        <div id="dynamic-layers"></div>
      </div>
    `;
    
    const baseLayersContainer = document.getElementById('base-layers');
    if (baseLayersContainer) {
      // Initialize base layers
      const forestLayer = createBaseLayer(map, 'forest');
      const hydroLayer = createBaseLayer(map, 'hydro');
      const cadastreLayer = createBaseLayer(map, 'cadastre');
      
      baseLayersContainer.innerHTML = `
        <div class="layer-item">
          <input type="checkbox" id="forest-layer" checked>
          <label for="forest-layer">
            <span style="display:inline-block; width:12px; height:12px; background-color:rgba(34,139,34,0.3); margin-right:6px; border:1px solid #555;"></span>
            BDForêt V2
          </label>
        </div>
        <div class="layer-item">
          <input type="checkbox" id="hydro-layer" checked>
          <label for="hydro-layer">
            <span style="display:inline-block; width:12px; height:12px; background-color:lightblue; margin-right:6px; border:1px solid #555;"></span>
            Hydrographie
          </label>
        </div>
        <div class="layer-item">
          <input type="checkbox" id="cadastre-layer">
          <label for="cadastre-layer">
            <span style="display:inline-block; width:12px; height:12px; background-color:rgba(199, 129, 23, 0.85); margin-right:6px; border:1px solid #555;"></span>
            Cadastre
          </label>
        </div>
        <div class="layer-item">
          <input type="checkbox" id="perturbations-layer" checked>
          <label for="perturbations-layer">
            <span style="display:inline-block; width:12px; height:12px; background-color:#D70040; margin-right:6px; border:1px solid #555;"></span>
            Perturbations
          </label>
        </div>
      `;
      
      // Set up event listeners for the layer checkboxes
      document.getElementById('forest-layer').addEventListener('change', function() {
        toggleLayer(map, forestLayer, this.checked);
      });
      
      document.getElementById('hydro-layer').addEventListener('change', function() {
        toggleLayer(map, hydroLayer, this.checked);
      });
      
      document.getElementById('cadastre-layer').addEventListener('change', function() {
        toggleLayer(map, cadastreLayer, this.checked);
      });
      
      // Add the perturbations layer event listener
      document.getElementById('perturbations-layer').addEventListener('change', function() {
        // We'll set up this handler when the CR layer is loaded
        if (window.perturbationsLayer) {
          toggleLayer(map, window.perturbationsLayer, this.checked);
        }
      });
    }
  }
}

/**
 * Toggle a layer on/off
 * @param {L.Map} map - The map
 * @param {L.Layer} layer - The layer to toggle
 * @param {boolean} isVisible - Whether to show or hide the layer
 */
function toggleLayer(map, layer, isVisible) {
  if (isVisible) {
    map.addLayer(layer);
  } else {
    map.removeLayer(layer);
  }
}

/**
 * Create a base layer
 * @param {L.Map} map - The map
 * @param {string} type - Layer type (forest, hydro, cadastre)
 * @returns {L.TileLayer} The created layer
 */
function createBaseLayer(map, type) {
  let layer;
  
  switch (type) {
    case 'forest':
      layer = L.tileLayer(
        'https://data.geopf.fr/wmts?layer=LANDCOVER.FORESTINVENTORY.V2&style=LANDCOVER.FORESTINVENTORY.V2&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
        {
          tileSize: 256,
          pane: "pane2",
          opacity: 0.3,
          minZoom: 0,
          maxZoom: 18,
        }
      );
      break;
    case 'hydro':
      layer = L.tileLayer(
        'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&LAYER=HYDROGRAPHY.HYDROGRAPHY&FORMAT=image/png&STYLE=normal&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}',
        {
          minZoom: 0,
          maxZoom: 18,
          tileSize: 256,
          opacity: 0.9
        }
      );
      break;
    case 'cadastre':
      layer = L.tileLayer(
        'https://data.geopf.fr/wmts?layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&style=PCI vecteur&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
        {
          tileSize: 256,
          minZoom: 0,
          maxZoom: 20,
        }
      );
      break;
  }
  
  // Add forest and hydro layers by default
  if (type === 'forest' || type === 'hydro') {
    layer.addTo(map);
  }
  
  return layer;
}

/**
 * Creates a layer control for the map
 * @param {L.Map} map - The map
 * @returns {L.Control.Layers} The layer control
 */
function createLayerControl(map) {
  // This creates a hidden layer control to manage the dynamic layers we'll add later
  const layerControl = L.control.layers(null, null, { position: 'topright' }).addTo(map);
  return layerControl;
}

/**
 * Initialize search functionality
 * @param {HTMLElement} searchInput - The search input element
 * @param {HTMLElement} autocompleteList - The autocomplete list element
 * @param {L.Map} map - The map
 */
function initializeSearchFunction(searchInput, autocompleteList, map) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (!query) {
      autocompleteList.innerHTML = "";
      return;
    }

    const apiUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`;
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.features || data.features.length === 0) {
          autocompleteList.innerHTML = '<div class="no-results">Aucune adresse trouvée.</div>';
          return;
        }

        const suggestionsHTML = data.features.map(feature => {
          const label = feature.properties.label;
          const { coordinates } = feature.geometry;
          const postalCode = feature.properties.citycode;
          return `<div class="autocomplete-item" data-lat="${coordinates[1]}" data-lng="${coordinates[0]}" data-postal="${postalCode}">${label}</div>`;
        }).join("");
        
        autocompleteList.innerHTML = suggestionsHTML;

        // Attach click handlers to results
        document.querySelectorAll(".autocomplete-item").forEach(item => {
          item.addEventListener("click", function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const selectedPostalCode = this.dataset.postal;
            const currentInseeCode = URL_COMMUNE_CODE;

            if (!isNaN(lat) && !isNaN(lng)) {
              if (selectedPostalCode && selectedPostalCode.toString() === currentInseeCode) {
                map.setView([lat, lng], 17);
              } else {
                window.location.href = `carte.html?commune=${selectedPostalCode}`;
              }
            }
            autocompleteList.innerHTML = "";
          });
        });
      })
      .catch(error => {
        console.error("Error querying API for autocomplete:", error);
        autocompleteList.innerHTML = '<div class="no-results">Erreur lors de la recherche.</div>';
      });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search-section")) {
      autocompleteList.innerHTML = "";
    }
  });
}

/**
 * Initialize the Forêt Score data
 */
function initializeForetScoreData() {
  import('./components/foret-score.js').then(({ calculateForetScore, loadAndDisplayForetScore }) => {
    loadAndDisplayForetScore();
  }).catch(err => {
    console.error("Error importing foret-score module:", err);
  });
}

/**
 * Loads and displays the Forêt Score data
 */
async function loadForetScoreData() {
  try {
    const communeCode = new URLSearchParams(window.location.search).get("commune") || 'defaultCode';
    const csvUrl = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/STATS/${communeCode}_stats.csv`;
    
    const response = await fetch(csvUrl);
    const text = await response.text();
    const [code, duree, surfaceTotal, surfaceBoisee, tauxBoisement, coupesHa, coupesPct] = text.trim().split(",").map(Number);

    const scoreThresholds = {
      boisement: [
        { min: 60, score: "A" },
        { min: 40, score: "B" },
        { min: 20, score: "C" },
        { min: 10, score: "D" },
        { min: 0, score: "E" },
      ],
      coupesPct: [
        { max: 0.1, score: "A" },
        { max: 0.2, score: "B" },
        { max: 0.5, score: "C" },
        { max: 1.2, score: "D" },
        { max: Infinity, score: "E" },
      ],
    };

    // Calculate score
    const scoreBoisement = scoreThresholds.boisement.find(threshold => tauxBoisement >= threshold.min).score;
    const scoreCoupes = scoreThresholds.coupesPct.find(threshold => coupesPct < threshold.max).score;
    const score = scoreBoisement > scoreCoupes ? scoreBoisement : scoreCoupes;

    // Update UI elements
    const imgEl = document.getElementById("foret-score-img");
    if (imgEl) {
      imgEl.src = `assets/Foret-Score-${score}.svg`;
      imgEl.alt = `Score ${score}`;
    }

    const detailsEl = document.getElementById("foret-score-details");
    if (detailsEl) {
      detailsEl.innerHTML = `
        <b>Surface :</b> ${Math.round(surfaceTotal).toLocaleString()} ha<br>
        <b>Dont forêt :</b> ${Math.round(surfaceBoisee).toLocaleString()} ha (${tauxBoisement.toFixed(0)} %)<br>
        <b>Coupes :</b> ${coupesHa.toFixed(2)} ha / an (${coupesPct.toFixed(2)} % / an)
      `;
    }
    
    // Update title if needed
    const titleEl = document.getElementById("foret-score-title");
    if (titleEl && window.communeName) {
      titleEl.textContent = window.communeName;
    }
  } catch (err) {
    console.error("Error loading Forêt Score data:", err);
    const detailsEl = document.getElementById("foret-score-details");
    if (detailsEl) {
      detailsEl.innerHTML = "Erreur lors du chargement des données Forêt Score";
    }
  }
}

/**
 * Loads all dynamic layers from config and adds them to the map
 * @param {L.Map} map - The map instance
 * @param {L.Control.Layers} layerControl - The layer control
 * @param {L.LatLngBounds} bounds - The bounds to use for the layers
 */
async function loadAllLayers(map, layerControl, bounds) {
  try {
    // Get bounding box as GeoJSON
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
    
    // Fetch layer configuration
    const response = await fetch('/layersConfig.json');
    if (!response.ok) {
      throw new Error(`Error fetching layer config: ${response.status}`);
    }
    
    const layersConfig = await response.json();
    const dynamicLayersContainer = document.getElementById('dynamic-layers');
    
    // Create and add each layer
    for (let i = 0; i < layersConfig.length; i++) {
      const config = layersConfig[i];
      
      try {
        // Replace placeholder with actual geometry parameter
        const url = config.url.replace('${geomParam}', geomParam);
        const layerResponse = await fetch(url);
        
        if (!layerResponse.ok) continue;
        
        const layerData = await layerResponse.json();
        if (!layerData.features || layerData.features.length === 0) continue;
        
        // Create layer and add to map/control
        const layer = L.geoJSON(layerData, {
          style: config.style,
          pane: "pane1"
        });
        
        // Add to layer control
        layerControl.addOverlay(layer, config.label);
        
        // Create sidebar entry
        if (dynamicLayersContainer) {
          createSidebarLayerItem(config, layer, dynamicLayersContainer, map, i);
        }
      } catch (err) {
        console.error(`Error loading layer ${config.label}:`, err);
      }
    }
    
    // Load and initialize the CR layer (perturbations)
    try {
      const communeCode = new URLSearchParams(window.location.search).get("commune") || 'defaultCode';
      const crUrl = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/CR/${communeCode}_cr.tif`;
      const response = await fetch(crUrl);
      if (!response.ok) throw new Error("CR data not available");
      
      const arrayBuffer = await response.arrayBuffer();
      const georaster = await parseGeoraster(arrayBuffer);
      
      // Initialize global state for year filtering
      window.selectedYear = null;
      
      // Create a single perturbations layer instance
      const perturbationsLayer = new GeoRasterLayer({
        georaster: georaster,
        pixelValuesToColorFn: values => {
          const [val] = values;
          if (val == null || isNaN(val) || val === georaster.noDataValue) return null;
          const yy = Math.floor(val / 1000);
          const year = 2000 + yy;
          if (window.selectedYear && year !== window.selectedYear) return null;
          return "#D70040";
        },
        resolution: 256,
        pane: "pane3",
        noDataValue: georaster.noDataValue
      });
      
      // Add to map
      perturbationsLayer.addTo(map);
      
      // Store reference to layer and data globally
      window.perturbationsLayer = perturbationsLayer;
      window.perturbationsData = georaster;
      
      // Set up the checkbox for this layer
      const perturbationsCheckbox = document.getElementById('perturbations-layer');
      if (perturbationsCheckbox) {
        perturbationsCheckbox.checked = true;
        perturbationsCheckbox.addEventListener('change', function() {
          if (this.checked) {
            if (!map.hasLayer(perturbationsLayer)) {
              map.addLayer(perturbationsLayer);
            }
          } else {
            if (map.hasLayer(perturbationsLayer)) {
              map.removeLayer(perturbationsLayer);
            }
          }
        });
      }
      
    } catch (err) {
      console.error("Error loading perturbations layer:", err);
      // Disable the perturbations checkbox if layer couldn't be loaded
      const perturbationsCheckbox = document.getElementById('perturbations-layer');
      if (perturbationsCheckbox) {
        perturbationsCheckbox.disabled = true;
        perturbationsCheckbox.parentElement.style.opacity = "0.5";
      }
    }
    
  } catch (err) {
    console.error("Error loading dynamic layers:", err);
  }
}

/**
 * Creates and adds layer items to the sidebar
 * @param {Object} config - Layer configuration object
 * @param {L.Layer} layer - The Leaflet layer
 * @param {HTMLElement} container - The container to add the layer to
 * @param {L.Map} map - The map instance
 * @param {number} index - Index of the layer
 */
function createSidebarLayerItem(config, layer, container, map, index) {
  const layerId = `layer-${index}`;
  const layerDiv = document.createElement('div');
  layerDiv.className = 'layer-item';
  
  // Extract the label text and HTML without the ID
  let labelHtml = config.label;
  
  // Create the HTML with a checkbox and the label
  layerDiv.innerHTML = `
    <input type="checkbox" id="${layerId}">
    <label for="${layerId}">${labelHtml}</label>
  `;
  
  container.appendChild(layerDiv);
  
  // Add event listener to toggle the layer
  const checkbox = layerDiv.querySelector(`#${layerId}`);
  if (checkbox) {
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        map.addLayer(layer);
      } else {
        map.removeLayer(layer);
      }
    });
  }
}
