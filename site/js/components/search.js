/**
 * Initialize the search functionality
 * @param {L.Map} map - The Leaflet map instance
 */
export function initializeSearch(map) {
  // Create the search container
  const searchContainer = L.control({ position: "topleft" });

  searchContainer.onAdd = function () {
    const container = L.DomUtil.create("div", "search-container leaflet-control-foret");
    container.style.zIndex = "9999";
    container.innerHTML = `
      <input type="text" id="searchInput" placeholder="Rechercher un lieu..." />
      <div id="autocompleteList" class="autocomplete-list"></div>
    `;
    return container;
  };

  searchContainer.addTo(map);

  // Setup event listeners after container is added to the DOM
  setupSearchEventListeners(map);
}

/**
 * Sets up event listeners for the search functionality
 * @param {L.Map} map - The Leaflet map instance
 */
function setupSearchEventListeners(map) {
  const searchInput = document.getElementById("searchInput");
  const autocompleteList = document.getElementById("autocompleteList");
  
  if (!searchInput || !autocompleteList) {
    console.error("Search elements not found in the DOM");
    return;
  }

  // Input event for autocomplete
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
          item.addEventListener("click", function (e) {
            e.stopPropagation();
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const selectedPostalCode = this.dataset.postal;
            const currentInseeCode = new URLSearchParams(window.location.search).get("commune");

            if (!isNaN(lat) && !isNaN(lng)) {
              if (selectedPostalCode && selectedPostalCode.toString() === currentInseeCode) {
                map.setView([lat, lng], 17);
              } else {
                window.location.href = `carte.html?commune=${selectedPostalCode}`;
              }
            } else {
              console.error("Invalid or missing latitude/longitude data.");
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

  // Close autocomplete when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      autocompleteList.innerHTML = "";
    }
  });

  // Prevent map click when interacting with search
  const searchContainerElement = document.querySelector(".search-container");
  if (searchContainerElement) {
    L.DomEvent.disableClickPropagation(searchContainerElement);
  }
}
