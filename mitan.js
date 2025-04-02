function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

const communeCode = getQueryParam("commune") || "defaultCode";
const geojsonUrl = `https://geo.api.gouv.fr/communes?code=${communeCode}&geometry=contour&format=geojson`;
const csvUrl = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/STATS/${communeCode}_stats.csv`;
const crUrl = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/CR/${communeCode}_cr.tif`;

document.addEventListener("DOMContentLoaded", function() {
  // Get the "commune" parameter from the URL (assuming it's a commune code)
  const params = new URLSearchParams(window.location.search);
  const communeCode = params.get("commune");

  if (communeCode) {
    // Fetch the commune's name from the geo.api.gouv.fr API
    fetch(`https://geo.api.gouv.fr/communes?code=${communeCode}&fields=nom&format=json`)
      .then(response => response.json())
      .then(data => {
        if (data && data.length > 0 && data[0].nom) {
          const communeName = data[0].nom;

          // Update the page title
          document.title = communeName;

          // Update the title in the Foret Score box
          const titleRow = document.querySelector(".foret-score-box .title");
          if (titleRow) {
            titleRow.textContent = communeName;
          }

          // Update the title and structure the Foret Score box
          const foretScoreBox = document.getElementById("foret-score-box");
          if (foretScoreBox) {
            // Ensure the box has a title row and a content row
            let titleRow = foretScoreBox.querySelector(".title");
            let contentRow = foretScoreBox.querySelector(".row");
        
            if (!titleRow) {
              titleRow = document.createElement("div");
              titleRow.className = "title";
              foretScoreBox.appendChild(titleRow);
            }
            titleRow.textContent = communeName;
        
            if (!contentRow) {
              contentRow = document.createElement("div");
              contentRow.className = "row";
              foretScoreBox.appendChild(contentRow);
            }
        
            // Add the image to the left column
            let imageColumn = contentRow.querySelector(".image-column");
            if (!imageColumn) {
              imageColumn = document.createElement("div");
              imageColumn.className = "image-column";
              contentRow.appendChild(imageColumn);
            }
            const imageElement = document.getElementById("foret-score-img");
            if (imageElement && !imageColumn.contains(imageElement)) {
              imageColumn.appendChild(imageElement);
            }
        
            // Add the text to the right column
            let textColumn = contentRow.querySelector(".text-column");
            if (!textColumn) {
              textColumn = document.createElement("div");
              textColumn.className = "text-column";
              contentRow.appendChild(textColumn);
            }
            const detailsElement = document.getElementById("foret-score-details");
            if (detailsElement && !textColumn.contains(detailsElement)) {
              textColumn.appendChild(detailsElement);
            }
          } else {
            console.warn("Foret score box not found.");
          }
        } else {
          console.warn("No commune data returned.");
        }
      })
      .catch(err => console.error("Error fetching commune name:", err));
  } else {
    console.warn("No commune parameter found in the URL.");
  }
});

var map = L.map('map', {
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

var cadastreLayer = L.tileLayer(
  'https://data.geopf.fr/wmts?layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&style=PCI vecteur&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}', 
  {
      tileSize: 256,
      minZoom: 0,
      maxZoom: 20,
  }
)

// Utility functions
async function loadGeoJSON(url) {
    const response = await fetch(url);
    return await response.json();
}

(async function() {
    ['pane1', 'pane2', 'pane3', 'pane4'].forEach((pane, index) => {
        map.createPane(pane);
        map.getPane(pane).style.zIndex = 400 + (index * 100);
    });

    const aoiData = await loadGeoJSON(geojsonUrl);
    const aoiLayer = L.geoJSON(aoiData, {
        style: {
            color: '#ffffff',
            weight: 2.5,
            fillOpacity: 0
        },
        pane: "pane1"
    }).addTo(map);
    map.fitBounds(aoiLayer.getBounds());

    const forestLayer = L.tileLayer(
      'https://data.geopf.fr/wmts?layer=LANDCOVER.FORESTINVENTORY.V2&style=LANDCOVER.FORESTINVENTORY.V2&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
      {
        tileSize: 256,
        pane: "pane2",
        opacity: 0.3, // semi-transparent
        minZoom: 0,
        maxZoom: 18,
      }
    ).addTo(map);

    const hydroLayer = L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&LAYER=HYDROGRAPHY.HYDROGRAPHY&FORMAT=image/png&STYLE=normal&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}', {
      minZoom: 0,
      maxZoom: 18,
      tileSize: 256,
      opacity: 0.9
    }).addTo(map);


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
        moreInfoButton.textContent = "Chargement...";
        moreInfoButton.disabled = true;
    
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
            const crResponse = await fetchWithTimeout(crUrl, {});
            if (!crResponse.ok) throw new Error(`CR fetch failed: ${crResponse.status}`);
            const crBuffer = await crResponse.arrayBuffer();
            const georaster = await parseGeoraster(crBuffer);
            const { xmin, xmax, ymin, ymax, width, height, projection } = georaster;

            // Handle undefined or unsupported projection
            const rasterProjection = "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"; // EPSG:2154 (Lambert-93)
            const wgs84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"; // WGS84 projection
            // Convert lat/lng to the same projection as the raster
            const [x, y] = proj4(wgs84, rasterProjection, [lng, lat]);

            // Convert x and y to pixel coordinates
            const xPixel = Math.floor((x - xmin) / (xmax - xmin) * width);
            const yPixel = Math.floor((ymax - y) / (ymax - ymin) * height);
              // check that x and y are within the raster bounds
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

                  function dfs(px, py) {
                    const key = `${px},${py}`;
                    if (px < 0 || px >= width || py < 0 || py >= height || visited.has(key)) return;
                    const value = georaster.values[0][py][px];
                    if (value == 4294967295 || isNaN(value)) return; // Ensure the same perturbation value

                    visited.add(key);
                    surface += 1;

                    dfs(px + 1, py);
                    dfs(px - 1, py);
                    dfs(px, py + 1);
                    dfs(px, py - 1);
                  }

                  dfs(xPixel, yPixel);

                  // Convert surface from pixels to hectares (assuming 10m x 10m pixels)
                  const surfaceHectares = (surface * 100) / 10000;

                  detailedContent += `<br><b>Perturbation</b><br>Date : ${day}-${month}-${year}<br>Surface : ${surfaceHectares.toFixed(2)} ha<br><br>`;
                } else {
                  detailedContent += `<br><b>Perturbation</b>: Indisponible<br>`;
                }
                } else {
                detailedContent += `<br><b>Perturbation</b>: Indisponible<br>`;
                }
            } catch (crError) {
            console.error("CR layer error:", crError);
            detailedContent += `<b>Perturbation</b>: Indisponible<br>`;
            }
    
          // 2. Get altitude from IGN geoservices using GET
          try {
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
              detailedContent += `<b>Altitude</b>: ${altitude.toFixed(1)} m<br>`;
            } else if (Array.isArray(altitudeData) && altitudeData.length > 0) {
              const altitude = altitudeData[0];
              detailedContent += `<b>Altitude</b>: ${altitude.toFixed(1)} m<br>`;
            } else {
              detailedContent += `<b>Altitude</b>: Non disponible<br>`;
            }
          } catch (altitudeError) {
            console.error("Altitude error:", altitudeError);
            detailedContent += `<b>Altitude</b>: Erreur de chargement<br>`;
          }
    
          // 3. Get forest information from BDForêt
          try {
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
    
              detailedContent += `<br><b>BDForêt V2</b><br>`;
              detailedContent += `Code: ${forestData.code}<br>`;
              detailedContent += `Type de formation: ${forestData.formation}<br>`;
              detailedContent += `Type générique: ${forestData.generic}<br>`;
              detailedContent += `Essence: ${forestData.essence}<br>`;
            } else {
              detailedContent += `<b>BDForêt V2</b>: Non disponible<br>`;
            }
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
      });
    
      // "Aller voir la page de cette commune" button listener
      communePageButton.addEventListener("click", async function () {
        communePageButton.textContent = "Chargement...";
        communePageButton.disabled = true;
    
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
          communePageButton.textContent = "Voir la page de cette commune";
          communePageButton.disabled = false;
        }
      });
    });

    const bounds = aoiLayer.getBounds();
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

    function fetchAndAddLayer(url, style, label) {
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error("Erreur lors de la récupération des données.");
          return response.json();
        })
        .then(layerData => {
          const layer = L.geoJSON(layerData, {
            style: style,
            pane: "pane1"
          });
          layerControl.addOverlay(layer, label);
        })
        .catch(err => console.error(err));
    }
    
    const layersConfig = [
      {
        url: `https://apicarto.ign.fr/api/nature/natura-habitat?geom=${geomParam}`,
        style: {
          color: '#AAFF00',
          weight: 2,
          fillColor: '#AAFF00',
          fillOpacity: 0.2
        },
        label: '<span class="layer-natura-habitat"></span>Natura 2000 - Habitat'
      },
      {
        url: `https://apicarto.ign.fr/api/nature/natura-oiseaux?geom=${geomParam}`,
        style: {
          color: '#7DF9FF',
          weight: 2,
          fillColor: '#7DF9FF',
          fillOpacity: 0.2
        },
        label: '<span class="layer-natura-oiseaux"></span>Natura 2000 - Oiseaux'
      },
      {
        url: `https://apicarto.ign.fr/api/nature/znieff1?geom=${geomParam}`,
        style: {
          color: '#E4D00A',
          weight: 2,
          fillColor: '#E4D00A',
          fillOpacity: 0.2
        },
        label: '<span class="layer-znieff1"></span>ZNIEFF1'
      },
      {
        url: `https://apicarto.ign.fr/api/nature/znieff2?geom=${geomParam}`,
        style: {
          color: '#DFFF00',
          weight: 2,
          fillColor: '#DFFF00',
          fillOpacity: 0.2
        },
        label: '<span class="layer-znieff2"></span>ZNIEFF2'
      }
    ];
    
    // Loop through the configuration and fetch layers
    layersConfig.forEach(config => {
      fetchAndAddLayer(config.url, config.style, config.label);
    });

    fetch(crUrl)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
          let selectedYear = null; 
          
          const CR_layer = new GeoRasterLayer({
            georaster: georaster,
            pixelValuesToColorFn: values => {
              const [val] = values;
              if (val == null || isNaN(val) || val === georaster.noDataValue) return null; // Ensure no color for invalid values
              const yy = Math.floor(val / 1000);
              const year = 2000 + yy;
              if (selectedYear && year !== selectedYear) return null;
              return "#D70040";
            },
            resolution: 256,
            pane: "pane3",
            noDataValue: georaster.noDataValue // Explicitly set noDataValue to avoid coloring the bbox
          });
          layerControl.addOverlay(CR_layer, '<span style="display:inline-block; width:12px; height:12px; background-color:firebrick; margin-right:6px; border:1px solid #555;"></span>Perturbations');
          CR_layer.addTo(map);

          // Compute total area per year
          const values = georaster.values[0]; 
          const yearAreaMap = {};
          for (let row = 0; row < values.length; row++) {
            for (let col = 0; col < values[0].length; col++) {
              const val = values[row][col];
              if (val == null || isNaN(val) || val === georaster.noDataValue) continue;
              const yy = Math.floor(val / 1000);
              if (yy < 18 || yy > 25) continue;
              const year = 2000 + yy;
              yearAreaMap[year] = (yearAreaMap[year] || 0) + 100;
            }
          }

          const years = Object.keys(yearAreaMap).sort();
          const areas = years.map(year => yearAreaMap[year] / 10000);
          const chartContainer = document.createElement("div");
          chartContainer.innerHTML = `<canvas id="areaChart"></canvas>`;
          chartContainer.className = "chart-container"; // Add a class instead of inline styles
          document.getElementById("map").appendChild(chartContainer);
          L.DomEvent.disableClickPropagation(chartContainer);

          const ctx = document.getElementById("areaChart").getContext("2d");
          const chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: years,
              datasets: [{
                label: 'Coupes (ha)',
                data: areas,
                backgroundColor: '#D70040'
              }]
            },
            options: {
              plugins: {
                legend: { display: true }
              },
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const clickedIndex = elements[0].index;
                  const yearClicked = parseInt(chart.data.labels[clickedIndex]);
                  selectedYear = (selectedYear === yearClicked) ? null : yearClicked;
                  chart.data.datasets[0].backgroundColor = chart.data.labels.map(label =>
                    selectedYear && parseInt(label) === selectedYear ? '#d72c00' : '#D70040'
                  );
                  chart.update();
                  CR_layer.redraw();
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { display: true },
                  grid: { display: true }
                },
                x: {
                  ticks: { display: true },
                  grid: { display: false }
                }
              }
            }
          });
        });
      });

    // Customize the layer control toggle
    var layerControl = L.control.layers(null, {
        '<span style="display:inline-block; width:12px; height:12px; background-color:rgba(34,139,34,0.3); margin-right:6px; border:1px solid #555;"></span>BDForêt V2': forestLayer,
        '<span style="display:inline-block; width:12px; height:12px; background-color:lightblue; margin-right:6px; border:1px solid #555;"></span>Hydrographie': hydroLayer,
        '<span style="display:inline-block; width:12px; height:12px; background-color:rgba(199, 129, 23, 0.85); margin-right:6px; border:1px solid #555;"></span>Cadastre': cadastreLayer,
    }, { collapsed: true, position: 'topleft' }).addTo(map);

    // Modify the control toggle to be larger and modern
    var layerControlContainer = layerControl.getContainer();
    layerControlContainer.classList.add("modern-layer-control");

    // Add a collapsed "Sources" button at the bottom left corner
/*     Le <strong>Forêt-Score</strong> est un indicateur destiné à évaluer la qualité et la durabilité des forêts d’une commune, à l’image du Nutri-Score pour l’alimentation. Il repose sur plusieurs <strong>critères</strong> liés à la <strong>gestion forestière</strong>, aux <strong>pratiques d’exploitation</strong> et à la <strong>préservation de la biodiversité</strong>.<br>
 */
    const sourcesContent = `
      <b>À savoir</b><br>
      Les <strong>perturbations</strong>, en rouge, sont des changements brutaux de la végétation détectées par satellite. Ce sont surtout des <strong>coupes rases et incendies</strong>.<br>
      Il est judicieux de se questionner face à des données : consultez la page <a href="details.html">Détails</a> pour en apprendre plus sur les limites des <b>processus automatisés</b> de classification des forêts et détection des perturbations.<br>

      <br><b>Sources</b><br>
      <br><b>Annotation des forêts</b><br>
      <a href="https://geoservices.ign.fr/bdforet" target="_blank">BDForêt® V2</a> sous <a href="https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf" target="_blank">Licence ETALAB-Licence-Ouverte-v2.0</a><br><br>

      <b>Couches de base et altitudes</b><br>
      Fond, Hydrographie, BDForêt V2, Espaces Protégés © IGN/Géoplateforme<br>
      <a href="https://geoservices.ign.fr/services-geoplateforme-altimetrie" target="_blank">Service Géoplateforme de calcul altimétrique</a> sous <a href="https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf" target="_blank">Licence ETALAB-Licence-Ouverte-v2.0</a><br><br>

      <b>Données satellite</b><br>
      Copernicus (<a href="https://sentiwiki.copernicus.eu/web/s2-mission" target="_blank">satellite Sentinel 2</a>) obtenues par <a href="https://www.sentinel-hub.com/" target="_blank">Sentinel-Hub</a>, sous <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank">Licence CC-BY-SA</a><br><br>

      <b>Fond de carte</b>: IGN-F / Geoportail.<br>
      <b>Perturbations et calculs associés</b> – <a href="https://ieeexplore.ieee.org/abstract/document/10604724" target="_blank">S. Mermoz et al.</a> sous licence <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.fr" target="_blank">Licence CC-BY-NC</a>, et algorithme maison sous <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank">Licence CC-BY-SA</a><br>
    `;
    

    
    const sourcesControl = L.control({ position: 'bottomright' });
    sourcesControl.onAdd = function () {
      const container = L.DomUtil.create('div', 'leaflet-control-custom');
      container.innerHTML = `
        <button id="sourcesToggle">Détails et sources</button>
        <div class="sources-content">${sourcesContent}</div>
      `;
      
      container.querySelector('#sourcesToggle').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering map click events
        const sourcesDiv = container.querySelector('.sources-content');
        sourcesDiv.style.display = sourcesDiv.style.display === 'none' ? 'block' : 'none';
      });

      L.DomEvent.disableClickPropagation(container); // Prevent map click events when interacting with the control
      return container;
    };
    sourcesControl.addTo(map);
    
    // Close sources box and popups when clicking elsewhere
    document.addEventListener('click', (e) => {
      // Close the "Sources" box if open
      const sourcesDiv = document.querySelector('.sources-content');
      if (sourcesDiv && sourcesDiv.style.display === 'block' && !e.target.closest('.leaflet-control-custom')) {
        sourcesDiv.style.display = 'none';
      }
    
      // Close the popup if open
      if (!e.target.closest('.leaflet-popup') && !e.target.closest('.leaflet-container')) {
        map.closePopup();
      }
    });

    const utilisationContent = `
        <li><b>Cliquer sur la carte :</b> Obtenez des informations détaillées sur un endroit spécifique.</li>
        <li><b>Changer de commune :</b> Utilisez la barre de recherche ou cliquez sur la carte.</li>
        <li><b>Filtrer les coupes :</b> Cliquez sur une année du graphique pour filtrer les perturbations associées.</li>
        <li><b>Activer/Désactiver des couches :</b> Utilisez le menu en haut à gauche.</li>
      </ul>
    `;

    const utilisationControl = L.control({ position: 'bottomleft' });
    utilisationControl.onAdd = function () {
      const container = L.DomUtil.create('div', 'leaflet-control-custom');
      container.innerHTML = `
        <button id="utilisationToggle">Comment naviguer ?</button>
        <div class="utilisation-content">${utilisationContent}</div>
      `;
      
      container.querySelector('#utilisationToggle').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering map click events
        const utilisationDiv = container.querySelector('.utilisation-content');
        utilisationDiv.style.display = utilisationDiv.style.display === 'none' ? 'block' : 'none';
      });

      L.DomEvent.disableClickPropagation(container); // Prevent map click events when interacting with the control
      return container;
    };
    utilisationControl.addTo(map);
    
    // Close utilisation box when clicking elsewhere
    document.addEventListener('click', (e) => {
      const utilisationDiv = document.querySelector('.utilisation-content');
      if (utilisationDiv && utilisationDiv.style.display === 'block' && !e.target.closest('.leaflet-control-custom')) {
        utilisationDiv.style.display = 'none';
      }
    });
})();
    
    
(async function loadAndDisplayForetScore(csvUrl) {
  const CSV_URL = csvUrl;

  function getForetScore(boisement, coupesPct) {
    let scoreBoisement = "E";
    if (boisement >= 60) scoreBoisement = "A";
    else if (boisement >= 40) scoreBoisement = "B";
    else if (boisement >= 20) scoreBoisement = "C";
    else if (boisement >= 10) scoreBoisement = "D";

    let scoreCoupes = "E";
    if (coupesPct < 0.1) scoreCoupes = "A";
    else if (coupesPct < 0.2) scoreCoupes = "B";
    else if (coupesPct < 0.5) scoreCoupes = "C";
    else if (coupesPct < 1.2) scoreCoupes = "D";

    // Take the worst of the two (i.e., max letter)
    return scoreBoisement > scoreCoupes ? scoreBoisement : scoreCoupes;
  }

  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const [code, duree, surfaceTotal, surfaceBoisee, tauxBoisement, coupesHa, coupesPct] = text.trim().split(",").map(Number);

    const score = getForetScore(tauxBoisement, coupesPct);

    const imgEl = document.getElementById("foret-score-img");
    imgEl.src = `assets/Foret-Score-${score}.svg`;

    document.getElementById("foret-score-img").alt = `Score ${score}`;

    document.getElementById("foret-score-details").innerHTML = `
      <b>Surface :</b>  ${Math.round(surfaceTotal).toLocaleString()} ha<br>
      <b>Dont forêt :</b>  ${Math.round(surfaceBoisee).toLocaleString()} ha (${tauxBoisement.toFixed(0)} %)<br>
      <b>Coupes :</b> ${coupesHa.toFixed(2)} ha / an (${coupesPct.toFixed(2)} % / an)
    `;

  } catch (err) {
    console.error("Erreur lors du chargement du CSV ou du calcul du Forêt-Score :", err);
  }
})(csvUrl);

function createForetScoreBox() {
  const foretScoreBox = L.control({ position: "topleft" });

  foretScoreBox.onAdd = function () {
    const container = L.DomUtil.create("div", "foret-score-box leaflet-control-foret");

    // Add title row
    const titleRow = document.createElement("div");
    titleRow.className = "title";
    container.appendChild(titleRow);

    // Add content row
    const contentRow = document.createElement("div");
    contentRow.className = "row";
    container.appendChild(contentRow);

    // Add image column
    const imageColumn = document.createElement("div");
    imageColumn.className = "image-column";
    contentRow.appendChild(imageColumn);

    const img = document.createElement("img");
    img.id = "foret-score-img";
    img.alt = "Forêt Score";
    imageColumn.appendChild(img);

    // Add text column
    const textColumn = document.createElement("div");
    textColumn.className = "text-column";
    contentRow.appendChild(textColumn);

    const details = document.createElement("div");
    details.id = "foret-score-details";
    textColumn.appendChild(details);

    // Prevent map clicks when interacting with the Foret Score box
    L.DomEvent.disableClickPropagation(container);

    return container;
  };

  foretScoreBox.addTo(map);

  // Adjust the width of the Foret Score box dynamically
  const adjustForetScoreBoxWidth = () => {
    const mapElement = document.getElementById("map");
    const foretScoreBoxElement = document.querySelector(".foret-score-box");
    if (mapElement && foretScoreBoxElement) {
      const mapWidth = mapElement.offsetWidth;
      foretScoreBoxElement.style.width = `${Math.min(mapWidth * 0.5, 500)}px`; // 50% of map width, max 500px
    }
  };

  // Set initial width and call on resize
  adjustForetScoreBoxWidth();
  window.addEventListener("resize", adjustForetScoreBoxWidth);
}

document.addEventListener("DOMContentLoaded", function () {
  // Create the search container
  const searchContainer = L.control({ position: "topleft" });

  searchContainer.onAdd = function () {
    const container = L.DomUtil.create("div", "search-container leaflet-control-foret");
    container.style.zIndex = "9999"; // Ensure the container has the highest z-index
    container.innerHTML = `
      <input type="text" id="searchInput" placeholder="Rechercher un lieu..." />
      <div id="autocompleteList" class="autocomplete-list"></div>
    `;

    return container;
  };

  searchContainer.addTo(map);

  // Attach event listeners for autocomplete functionality
  const searchInput = document.getElementById("searchInput");
  const autocompleteList = document.getElementById("autocompleteList");

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

        document.querySelectorAll(".autocomplete-item").forEach(item => {
          item.addEventListener("click", function (e) {
            e.stopPropagation(); // Prevent triggering map click events
            const lat = this.dataset.lat;
            const lng = this.dataset.lng;
            const selectedPostalCode = this.dataset.postal;
            const currentInseeCode = new URLSearchParams(window.location.search).get("commune");

            if (selectedPostalCode && selectedPostalCode.toString() === currentInseeCode) {
              map.setView([lat, lng], 17);
            } else {
              window.location.href = `carte.html?commune=${selectedPostalCode}`;
            }
            autocompleteList.innerHTML = "";
          });
        });
      })
      .catch(error => {
        console.error("Error querying API for autocomplete:", error);
        autocompleteList.innerHTML = '<div class="no-results">Erreur lors de la recherche. Veuillez réessayer.</div>';
      });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      autocompleteList.innerHTML = "";
    }
  });

  // Prevent map popup when clicking on the search container
  const searchContainerElement = document.querySelector(".search-container");
  L.DomEvent.disableClickPropagation(searchContainerElement);

  // Adjust the width of .leaflet-control-foret dynamically
  const adjustForetControlWidth = () => {
    const mapElement = document.getElementById("map");
    const foretControls = document.querySelectorAll(".leaflet-control-foret");
    if (mapElement) {
      const mapWidth = mapElement.offsetWidth;
      foretControls.forEach(control => {
        control.style.width = `${Math.min(mapWidth * 0.5, 500)}px`; // 50% of map width, max 500px
      });
    }
  };

  // Call on load and resize
  adjustForetControlWidth();
  window.addEventListener("resize", adjustForetControlWidth);

  // ...existing code...
  createForetScoreBox();
  // ...existing code...
});
