import { CR_URL } from '../config/constants.js';

/**
 * Initializes the CR (Perturbations) data interactions
 * @param {L.Map} map - The Leaflet map instance
 * @param {L.Control.Layers} layerControl - The Leaflet layer control
 */
export function initializeCRData(map, layerControl) {
  try {
    // Check if we already have the perturbations data and layer
    if (!window.perturbationsData || !window.perturbationsLayer) {
      console.warn("Perturbations data or layer not found");
      return;
    }
    
    // Clean up any existing chart instance properly
    if (window.areaChart) {
      try {
        // Different versions of Chart.js have different cleanup methods
        if (typeof window.areaChart.destroy === 'function') {
          window.areaChart.destroy();
        } else if (typeof window.areaChart.clear === 'function') {
          window.areaChart.clear(); // Remove the extra braces here that were causing syntax error
        }
      } catch (e) {
        console.warn("Could not properly clean up previous chart:", e);
      }
      window.areaChart = null;
    }
    
    // Get the chart canvas element
    const ctx = document.getElementById("areaChart");
    if (!ctx) {
      console.error("Chart canvas not found");
      return;
    }
    
    // Create the area chart using the existing georaster data
    createAreaChart(window.perturbationsData, map, window.perturbationsLayer);
    
    console.log("CR data interactions initialized successfully");
  } catch (error) {
    console.error("Error initializing CR data:", error);
  }
}

/**
 * Creates the area chart showing perturbations by year
 * @param {Object} georaster - The georaster object
 * @param {L.Map} map - The Leaflet map instance
 * @param {GeoRasterLayer} perturbationsLayer - The perturbations layer
 */
function createAreaChart(georaster, map, perturbationsLayer) {
  try {
    // Compute total area per year
    const values = georaster.values[0];
    const yearAreaMap = {};
    
    // Count pixels for each year
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[0].length; col++) {
        const val = values[row][col];
        if (val == null || isNaN(val) || val === georaster.noDataValue) continue;
        const yy = Math.floor(val / 1000);
        if (yy < 0 || yy > 30) continue; // Sanity check on year range
        const year = 2000 + yy;
        yearAreaMap[year] = (yearAreaMap[year] || 0) + 100; // Each pixel is 10m x 10m = 100 sq meters
      }
    }
    
    const years = Object.keys(yearAreaMap).sort();
    const areas = years.map(year => yearAreaMap[year] / 10000); // Convert to hectares
    
    const ctx = document.getElementById("areaChart");
    if (!ctx) {
      console.error("Chart canvas not found");
      return;
    }
    
    // Create chart with Chart.js (compatible with both v2.x and v3.x)
    window.areaChart = new Chart(ctx.getContext("2d"), {
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
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const clickedIndex = elements[0].index;
            const yearClicked = parseInt(years[clickedIndex]);
            
            // Toggle selected year
            window.selectedYear = (window.selectedYear === yearClicked) ? null : yearClicked;
            
            console.log("Year selected:", window.selectedYear);
            
            // Update chart colors
            window.areaChart.data.datasets[0].backgroundColor = years.map(year => 
              window.selectedYear && parseInt(year) === window.selectedYear ? '#d72c00' : '#D70040'
            );
            window.areaChart.update();
            
            // Update existing perturbations layer - PROPERLY PRESERVING THE COLOR FUNCTION
            if (perturbationsLayer) {
              // Instead of using updateColors which is causing the error,
              // recreate the pixelValuesToColorFn and redraw
              perturbationsLayer.options.pixelValuesToColorFn = values => {
                const [val] = values;
                if (val == null || isNaN(val) || val === georaster.noDataValue) return null;
                const yy = Math.floor(val / 1000);
                const year = 2000 + yy;
                if (window.selectedYear && year !== window.selectedYear) return null;
                return "#D70040";
              };
              
              // Force redraw
              perturbationsLayer.redraw();
              
              // Make sure the layer is visible when filtering by year
              if (window.selectedYear && !map.hasLayer(perturbationsLayer)) {
                map.addLayer(perturbationsLayer);
                // Update the checkbox state
                const checkbox = document.getElementById('perturbations-layer');
                if (checkbox) checkbox.checked = true;
              }
            }
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
  } catch (error) {
    console.error("Error creating area chart:", error);
  }
}
