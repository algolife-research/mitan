

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
          // Update the h1 element with class "title" to the commune name
          document.querySelector("h1.title").textContent = data[0].nom;
        } else {
          console.warn("No commune data returned.");
        }
      })
      .catch(err => console.error("Error fetching commune name:", err));
  } else {
    console.warn("No commune parameter found in the URL.");
  }
});

var map = L.map('map');

// Address search bar
L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Chercher une adresse...",
    collapsed: false
})
.on('markgeocode', function(e) {
    var latlng = e.geocode.center;
    map.setView(latlng, 12);
    L.marker(latlng).addTo(map)
        .bindPopup(e.geocode.name);
})
.addTo(map);

// Add base map layer
L.tileLayer(
    "https://data.geopf.fr/wmts?&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    {
        minZoom: 0,
        maxZoom: 18,
        attribution: "IGN-F/Geoportail",
        tileSize: 256
    }
).addTo(map);

// Utility functions
async function loadGeoJSON(url) {
    const response = await fetch(url);
    return await response.json();
}

(async function(geojsonUrl, crUrl) {
    ['pane1', 'pane2', 'pane3', 'pane4'].forEach((pane, index) => {
        map.createPane(pane);
        map.getPane(pane).style.zIndex = 400 + (index * 100);
    });

    const aoiData = await loadGeoJSON(geojsonUrl);
    const aoiLayer = L.geoJSON(aoiData, {
        style: {
            color: '#ffffff88',
            weight: 1.2,
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
        attribution: "BDForêt V2 - © IGN",
        minZoom: 0,
        maxZoom: 18,
      }
    ).addTo(map);

    map.on("click", function (e) {
      const latlng = e.latlng;
      const zoom = map.getZoom();
    
      const tileSize = 256;
      const point = map.project(latlng, zoom);
      const tileX = Math.floor(point.x / tileSize);
      const tileY = Math.floor(point.y / tileSize);
      const i = Math.floor(point.x) % tileSize;
      const j = Math.floor(point.y) % tileSize;
    
      const url = `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetFeatureInfo` +
                  `&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=LANDCOVER.FORESTINVENTORY.V2` +
                  `&TILEMATRIXSET=PM&TILEMATRIX=${zoom}&TILECOL=${tileX}&TILEROW=${tileY}` +
                  `&FORMAT=image/png&INFOFORMAT=text/html&I=${i}&J=${j}`;
    
      fetch(url)
        .then(response => response.text())
        .then(html => {
          const cleanHtml = html.trim();
          if (cleanHtml && !cleanHtml.includes("ServiceExceptionReport") && cleanHtml.length > 30) {
            L.popup()
              .setLatLng(latlng)
              .setContent(cleanHtml)
              .openOn(map);
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

    fetch(`https://apicarto.ign.fr/api/nature/natura-habitat?geom=${geomParam}`)
      .then(response => {
        if (!response.ok) throw new Error("Erreur lors de la récupération des données Natura 2000.");
        return response.json();
      })
      .then(naturaData => {
        const naturaLayer = L.geoJSON(naturaData, {
          style: {
            color: '#66bb6a',
            weight: 2,
            fillColor: '#a5d6a7',
            fillOpacity: 0.2
          },
          pane: "pane1"
        });
        layerControl.addOverlay(naturaLayer, '<span style="display:inline-block; width:12px; height:12px; background-color:#a5d6a7; margin-right:6px; border:1px solid #555;"></span>Natura 2000 - Habitat');
      })
      .catch(err => console.error(err));

    fetch(`https://apicarto.ign.fr/api/nature/natura-oiseaux?geom=${geomParam}`)
      .then(response => {
        if (!response.ok) throw new Error("Erreur lors de la récupération des données Natura 2000.");
        return response.json();
      })
      .then(naturaData => {
        const naturaLayer2 = L.geoJSON(naturaData, {
          style: {
            color: '#66bb6a',
            weight: 2,
            fillColor: '#a5d6a7',
            fillOpacity: 0.2
          },
          pane: "pane1"
        });
        layerControl.addOverlay(naturaLayer2, '<span style="display:inline-block; width:12px; height:12px; background-color:#a5d6a7; margin-right:6px; border:1px solid #555;"></span>Natura 2000 - Oiseaux');
      })
      .catch(err => console.error(err));

    fetch(`https://apicarto.ign.fr/api/nature/znieff1?geom=${geomParam}`)
      .then(response => {
        if (!response.ok) throw new Error("Erreur lors de la récupération des données Natura 2000.");
        return response.json();
      })
      .then(naturaData => {
        const naturaLayer3 = L.geoJSON(naturaData, {
          style: {
            color: '#66bb6a',
            weight: 2,
            fillColor: '#a5d6a7',
            fillOpacity: 0.2
          },
          pane: "pane1"
        });
        layerControl.addOverlay(naturaLayer3, '<span style="display:inline-block; width:12px; height:12px; background-color:#a5d6a7; margin-right:6px; border:1px solid #555;"></span>ZNIEFF1');
      })
      .catch(err => console.error(err));
      
    fetch(`https://apicarto.ign.fr/api/nature/znieff2?geom=${geomParam}`)
      .then(response => {
        if (!response.ok) throw new Error("Erreur lors de la récupération des données Natura 2000.");
        return response.json();
      })
      .then(naturaData => {
        const naturaLayer4 = L.geoJSON(naturaData, {
          style: {
            color: '#66bb6a',
            weight: 2,
            fillColor: '#a5d6a7',
            fillOpacity: 0.2
          },
          pane: "pane1"
        });
        layerControl.addOverlay(naturaLayer4, '<span style="display:inline-block; width:12px; height:12px; background-color:#a5d6a7; margin-right:6px; border:1px solid #555;"></span>ZNIEFF2');
      })
      .catch(err => console.error(err));

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
              return "firebrick";
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
          chartContainer.innerHTML = `<canvas id="areaChart" width="200" height="150"></canvas>`;
          chartContainer.style.position = "absolute";
          chartContainer.style.bottom = "20px";
          chartContainer.style.right = "10px";
          chartContainer.style.backgroundColor = "rgba(255, 255, 255, 1)";
          chartContainer.style.border = "1px solid #ccc";
          chartContainer.style.borderRadius = "3px";
          chartContainer.style.padding = "8px";
          chartContainer.style.zIndex = "1000";
          chartContainer.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
          document.getElementById("map").appendChild(chartContainer);
          L.DomEvent.disableClickPropagation(chartContainer);

          const ctx = document.getElementById("areaChart").getContext("2d");
          const chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: years,
              datasets: [{
                label: 'Coupes forestières (ha)',
                data: areas,
                backgroundColor: 'firebrick'
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
    }, { collapsed: false }).addTo(map);

    var layerControlContainer = layerControl.getContainer();
    var title = document.createElement("div");
    title.innerHTML = "<b>Couches</b>";
    title.style.textAlign = "left";
    title.style.padding = "0px";
    title.style.fontSize = "12px";
    title.style.backgroundColor = "white";
    layerControlContainer.insertBefore(title, layerControlContainer.firstChild);
})(geojsonUrl, crUrl);
    
    
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
      <b>Taux de coupes (surface) :</b> ${coupesHa.toFixed(3)} hectares par an<br>
      <b>Taux de coupes (pourcentage de forêt) :</b> ${coupesPct.toFixed(3)} % par an
    `;

    document.getElementById("foret-score-box").style.display = "flex";
  } catch (err) {
    console.error("Erreur lors du chargement du CSV ou du calcul du Forêt-Score :", err);
  }
})(csvUrl);
