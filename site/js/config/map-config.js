/**
 * Creates and configures the Leaflet map
 * @param {string} elementId - ID of the HTML element to contain the map
 * @returns {L.Map} The configured map
 */
export function setupMap(elementId) {
  // Create map with options
  const map = L.map(elementId, {
    zoomControl: false,
    attributionControl: false
  });
  
  // Add base map layer
  L.tileLayer(
    "https://data.geopf.fr/wmts?&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    {
      minZoom: 0,
      maxZoom: 18,
      tileSize: 256
    }
  ).addTo(map);
  
  // Create map panes for layer ordering
  ['pane1', 'pane2', 'pane3', 'pane4'].forEach((pane, index) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 400 + (index * 100);
  });
  
  return map;
}

// Base layers configuration
export const BASE_LAYERS = {
  cadastre: {
    url: 'https://data.geopf.fr/wmts?layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&style=PCI vecteur&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
    options: {
      tileSize: 256,
      minZoom: 0,
      maxZoom: 20,
    }
  },
  forest: {
    url: 'https://data.geopf.fr/wmts?layer=LANDCOVER.FORESTINVENTORY.V2&style=LANDCOVER.FORESTINVENTORY.V2&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
    options: {
      tileSize: 256,
      pane: "pane2",
      opacity: 0.3,
      minZoom: 0,
      maxZoom: 18,
    }
  },
  hydro: {
    url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&LAYER=HYDROGRAPHY.HYDROGRAPHY&FORMAT=image/png&STYLE=normal&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}',
    options: {
      minZoom: 0,
      maxZoom: 18,
      tileSize: 256,
      opacity: 0.9
    }
  }
};
