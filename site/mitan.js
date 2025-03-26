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

// Address search bar
L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Chercher une adresse...",
    collapsed: false
})
.on('markgeocode', function(e) {
    var latlng = e.geocode.center;
    map.setView(latlng, 14);
})
.addTo(map);

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
      if (map.hasLayer(map._popup)) {
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
    
            const { xmin, xmax, ymin, ymax, width, height } = georaster;
            const xRatio = (lng - xmin) / (xmax - xmin);
            const yRatio = (ymax - lat) / (ymax - ymin);
            const rasterX = Math.floor(xRatio * width);
            const rasterY = Math.floor(yRatio * height);
    
            if (rasterX >= 0 && rasterX < width && rasterY >= 0 && rasterY < height) {
              const crValue = georaster.values[0][rasterY][rasterX];
              if (crValue && crValue !== 4294967295 && !isNaN(crValue)) {
                const year = 2000 + Math.floor(crValue / 1000);
                detailedContent += `<b>Perturbation</b>: ${year}<br>`;
              } else {
                detailedContent += `<b>Perturbation</b>: Non détectée<br>`;
              }
            } else {
              detailedContent += `<b>Perturbation</b>: Non disponible<br>`;
            }
          } catch (crError) {
            console.error("CR layer error:", crError);
            detailedContent += `<b>Perturbation</b>: Erreur de chargement<br>`;
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
    
              detailedContent += `<br><b>BDForêt V2</b>:<br>`;
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
              if (val == null || isNaN(val) || val === 4294967295) return null;
              const yy = Math.floor(val / 1000);
              const year = 2000 + yy;
              if (selectedYear && year !== selectedYear) return null;
              return "#D70040";
            },
            resolution: 256,
            pane: "pane3"
          });
          layerControl.addOverlay(CR_layer, '<span style="display:inline-block; width:12px; height:12px; background-color:firebrick; margin-right:6px; border:1px solid #555;"></span>Perturbations');
          CR_layer.addTo(map);

          // Compute total area per year
          const values = georaster.values[0]; 
          const yearAreaMap = {};
          for (let row = 0; row < values.length; row++) {
            for (let col = 0; col < values[0].length; col++) {
              const val = values[row][col];
              if (val == null || isNaN(val) || val === 4294967295) continue;
              const yy = Math.floor(val / 1000);
              if (yy < 18 || yy > 25) continue;
              const year = 2000 + yy;
              yearAreaMap[year] = (yearAreaMap[year] || 0) + 100;
            }
          }

          const years = Object.keys(yearAreaMap).sort();
          const areas = years.map(year => yearAreaMap[year] / 10000);
          const chartContainer = document.createElement("div");
          chartContainer.innerHTML = `<canvas id="areaChart" width="150px" height="140"></canvas>`;
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
                    selectedYear && parseInt(label) === selectedYear ? 'darkred' : 'firebrick'
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

    var layerControl = L.control.layers(null, {
        '<span style="display:inline-block; width:12px; height:12px; background-color:rgba(34,139,34,0.3); margin-right:6px; border:1px solid #555;"></span>BDForêt V2': forestLayer,
        '<span style="display:inline-block; width:12px; height:12px; background-color:lightblue; margin-right:6px; border:1px solid #555;"></span>Hydrographie': hydroLayer,
        '<span style="display:inline-block; width:12px; height:12px; background-color:rgba(199, 129, 23, 0.85); margin-right:6px; border:1px solid #555;"></span>Cadastre': cadastreLayer,
    }, { collapsed: true }).addTo(map);

    var layerControlContainer = layerControl.getContainer();
    var title = document.createElement("div");
    title.innerHTML = "<b>Couches</b>";
    title.style.textAlign = "center";
    title.style.padding = "5px";
    title.style.backgroundColor = "white";
    layerControlContainer.insertBefore(title, layerControlContainer.firstChild);


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
    
    const sourcesControl = L.control({ position: 'bottomleft' });
    sourcesControl.onAdd = function () {
      const container = L.DomUtil.create('div', 'leaflet-control-custom');
      container.style.backgroundColor = 'white';
      container.style.padding = '5px';
      container.style.cursor = 'pointer';
      container.style.textAlign = 'left';
      container.style.border = '1px solid #ccc';
      container.style.borderRadius = '4px';
      container.style.width = '250px'; // Fixed width for better layout
      container.style.fontSize = '11px'; // Smaller font size for compactness
      container.innerHTML = '<button id="sourcesToggle" style="width: 100%; background-color: #f4f4f4; border: none; padding: 5px;">Détails et sources</button>';
      
      const sourcesDiv = L.DomUtil.create('div', 'sources-content', container);
      sourcesDiv.style.display = 'none';
      sourcesDiv.style.marginTop = '5px';
      sourcesDiv.style.padding = '5px';
      sourcesDiv.style.border = '1px solid #ccc';
      sourcesDiv.style.borderRadius = '4px';
      sourcesDiv.style.backgroundColor = 'white';
      sourcesDiv.style.maxHeight = '200px'; // Limit height
      sourcesDiv.style.overflowY = 'auto'; // Make scrollable
      sourcesDiv.innerHTML = sourcesContent;
    
      container.querySelector('#sourcesToggle').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering map click events
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
    imgEl.style.width = "170px";  // Set the width to 80 pixels
    imgEl.style.height = "auto"; // Optional: maintain the aspect ratio

    document.getElementById("foret-score-img").alt = `Score ${score}`;

    document.getElementById("foret-score-details").innerHTML = `
      <b>Forêt-Score :</b> ${score}<br>
      <b>Surface de la commune :</b>  ${Math.round(surfaceTotal).toLocaleString()} hectares<br>
      <b>Surface boisée :</b>  ${Math.round(surfaceBoisee).toLocaleString()} hectares<br>
      <b>Taux de boisement :</b> ${tauxBoisement.toFixed(2)} %<br>
      <b>Coupes / Perturbations (surface) :</b> ${coupesHa.toFixed(3)} hectares par an<br>
      <b>Coupes / Perturbations (% forêt) :</b> ${coupesPct.toFixed(3)} % par an
    `;

    document.getElementById("foret-score-box").style.display = "flex";
  } catch (err) {
    console.error("Erreur lors du chargement du CSV ou du calcul du Forêt-Score :", err);
  }
})(csvUrl);
