// Initialize the map without centering
var map = L.map('map');

// Add the tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 0,
    maxZoom: 18,
    attribution: "Contributeurs OpenStreetMaps",
    tileSize: 256
}).addTo(map);

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

// Define an array with three colors
var colors = ["#f79873", "#6f9685", "#824062"]; // Replace with your chosen colors
    var minZoomForPolygons = 10;
    var geojsonLayer;

    // Load GeoJSON file
    fetch("a-com2022.json") // Change to the actual GeoJSON path
      .then(response => response.json())
      .then(data => {
        // Create the GeoJSON layer (but don't add it to the map yet)
        geojsonLayer = L.geoJSON(data, {
          style: function(feature) {
            var randomColor = colors[Math.floor(Math.random() * colors.length)];
            return {
              color: randomColor,
              weight: 1,
              fillOpacity: 0
            };
          },
          onEachFeature: function(feature, layer) {
            if (feature.properties) {
              var communeName = feature.properties.libgeo || "Unknown";
              var communeID = feature.properties.codgeo || "";
              var linkHTML = communeID ? `<br><a href="./carte.html?commune=${communeID}" target="_blank">Consulter la page</a>` : "";
              var popupContent = `<strong>${communeName}</strong>${linkHTML}`;
              layer.bindPopup(popupContent);

              // Highlight on hover
              layer.on('mouseover', function () {
                layer.setStyle({ weight: 2, fillOpacity: 0.9 });
              });
              layer.on('mouseout', function () {
                layer.setStyle({ weight: 1, fillOpacity: 0 });
              });
              // Open popup on click
              layer.on('click', function () {
                layer.openPopup();
              });
            }
          }
        });

        // Fit the map bounds to the GeoJSON layer
        map.fitBounds(geojsonLayer.getBounds());

        // Initially add the layer only if the current zoom level is high enough
        if (map.getZoom() >= minZoomForPolygons) {
          geojsonLayer.addTo(map);
        }

        // Listen for zoom changes to toggle the polygon layer
        map.on('zoomend', function() {
          if (map.getZoom() >= minZoomForPolygons) {
            if (!map.hasLayer(geojsonLayer)) {
              map.addLayer(geojsonLayer);
            }
          } else {
            if (map.hasLayer(geojsonLayer)) {
              map.removeLayer(geojsonLayer);
            }
          }
        });
      })
      .catch(error => console.error('Error loading GeoJSON:', error));