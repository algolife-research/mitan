import { HELP_CONTENT, SOURCES_CONTENT } from '../config/constants.js';

/**
 * Initializes all info controls (help, sources, utilisation)
 * @param {L.Map} map - The Leaflet map instance
 */
export function initializeInfoControls(map) {
  addHelpControl(map);
  addSourcesControl(map);
  addUtilisationControl(map);
  
  // Set up global click handler to close popups
  setupGlobalClickHandler(map);
}

/**
 * Adds help control to the map
 * @param {L.Map} map - The Leaflet map instance
 */
function addHelpControl(map) {
  const helpControl = L.control({ position: 'topleft' });
  helpControl.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-control-help');
    container.innerHTML = `
      <button id="helpToggle" style="width: 100%; text-align: left;">🛟 Aide et détails</button>
      <div class="help-content">${HELP_CONTENT}</div>
    `;
    
    container.querySelector('#helpToggle').addEventListener('click', (e) => {
      e.stopPropagation();
      const content = container.querySelector('.help-content');
      const rect = container.getBoundingClientRect();
      const heightAbove = rect.top + rect.height;
      document.documentElement.style.setProperty('--height-above', `${heightAbove}px`);
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
  
    L.DomEvent.disableClickPropagation(container);
    return container;
  };
  helpControl.addTo(map);
}

/**
 * Adds sources information control to the map
 * @param {L.Map} map - The Leaflet map instance
 */
function addSourcesControl(map) {
  const sourcesControl = L.control({ position: 'bottomright' });
  sourcesControl.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-control-custom');
    container.innerHTML = `
      <button id="sourcesToggle">Détails et sources</button>
      <div class="sources-content">${SOURCES_CONTENT}</div>
    `;
    
    container.querySelector('#sourcesToggle').addEventListener('click', (e) => {
      e.stopPropagation();
      const sourcesDiv = container.querySelector('.sources-content');
      sourcesDiv.style.display = sourcesDiv.style.display === 'none' ? 'block' : 'none';
    });

    L.DomEvent.disableClickPropagation(container);
    return container;
  };
  sourcesControl.addTo(map);
}

/**
 * Adds utilisation guide control to the map
 * @param {L.Map} map - The Leaflet map instance
 */
function addUtilisationControl(map) {
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
      e.stopPropagation();
      const utilisationDiv = container.querySelector('.utilisation-content');
      utilisationDiv.style.display = utilisationDiv.style.display === 'none' ? 'block' : 'none';
    });

    L.DomEvent.disableClickPropagation(container);
    return container;
  };
  utilisationControl.addTo(map);
}

/**
 * Sets up global click handler to close popups and controls
 * @param {L.Map} map - The Leaflet map instance
 */
function setupGlobalClickHandler(map) {
  document.addEventListener('click', (e) => {
    // Close the "Sources" box if open
    const sourcesDiv = document.querySelector('.sources-content');
    if (sourcesDiv && sourcesDiv.style.display === 'block' && !e.target.closest('.leaflet-control-custom')) {
      sourcesDiv.style.display = 'none';
    }
    
    // Close the "Utilisation" box if open
    const utilisationDiv = document.querySelector('.utilisation-content');
    if (utilisationDiv && utilisationDiv.style.display === 'block' && !e.target.closest('.leaflet-control-custom')) {
      utilisationDiv.style.display = 'none';
    }
    
    // Close the "Help" content if open
    const helpContent = document.querySelector('.help-content');
    if (helpContent && helpContent.style.display === 'block' && !e.target.closest('.leaflet-control-help')) {
      helpContent.style.display = 'none';
    }
  
    // Close the popup if open and click was outside popup and map
    if (!e.target.closest('.leaflet-popup') && !e.target.closest('.leaflet-container')) {
      map.closePopup();
    }
  });
}
