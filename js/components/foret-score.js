import { SCORE_THRESHOLDS, CSV_URL } from '../config/constants.js';

/**
 * Initializes the Forêt Score component
 * @param {L.Map} map - The Leaflet map instance
 */
export function initializeForetScore(map) {
  if (!map) {
    console.error("Map instance not provided to initializeForetScore");
    return;
  }
  
  createForetScoreBox(map);
  loadAndDisplayForetScore(CSV_URL);
}

/**
 * Creates the Forêt Score box in the UI
 * @param {L.Map} map - The Leaflet map instance
 * @returns {L.Control} The Leaflet control containing the Forêt Score box
 */
function createForetScoreBox(map) {
  if (!map) {
    console.error("Map instance not provided to createForetScoreBox");
    return null;
  }

  const foretScoreBox = L.control({ position: "topleft" });

  foretScoreBox.onAdd = function () {
    const container = L.DomUtil.create("div", "scores-container leaflet-control-foret");

    // Add single title for both boxes
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    if (window.communeName) {
      titleRow.textContent = window.communeName;
    }
    container.appendChild(titleRow);

    // Create Forêt Score box
    const foretBox = document.createElement("div");
    foretBox.className = "foret-score-box";
    container.appendChild(foretBox);

    // Add vertical label for Forêt
    const verticalLabel = document.createElement("div");
    verticalLabel.className = "vertical-label";
    verticalLabel.textContent = "Forêt";
    foretBox.appendChild(verticalLabel);

    // Create score content container
    const scoreContent = document.createElement("div");
    scoreContent.className = "score-content";
    foretBox.appendChild(scoreContent);

    // Add score row (for image and text)
    const scoreRow = document.createElement("div");
    scoreRow.className = "score-row";
    scoreContent.appendChild(scoreRow);

    // Add image column
    const imageColumn = document.createElement("div");
    imageColumn.className = "image-column";
    scoreRow.appendChild(imageColumn);

    const img = document.createElement("img");
    img.id = "foret-score-img";
    img.alt = "Forêt Score";
    imageColumn.appendChild(img);

    // Add text column
    const textColumn = document.createElement("div");
    textColumn.className = "text-column";
    scoreRow.appendChild(textColumn);

    const details = document.createElement("div");
    details.id = "foret-score-details";
    textColumn.appendChild(details);

    // Add chart container below image and text
    const chartContainer = document.createElement("div");
    chartContainer.className = "chart-container";
    chartContainer.innerHTML = '<canvas id="areaChart"></canvas>';
    scoreContent.appendChild(chartContainer);

    // Create Eau Score box (placeholder)
    const eauBox = document.createElement("div");
    eauBox.className = "eau-score-box";
    eauBox.id = "eau-score-box";
    container.appendChild(eauBox);

    // Add vertical label for Eau
    const eauLabel = document.createElement("div");
    eauLabel.className = "vertical-label";
    eauLabel.textContent = "Eau";
    eauBox.appendChild(eauLabel);

    // Add placeholder content
    const placeholderContent = document.createElement("div");
    placeholderContent.className = "placeholder-content";
    placeholderContent.textContent = "À venir";
    eauBox.appendChild(placeholderContent);

    // Prevent map clicks when interacting with the score boxes
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
  };

  foretScoreBox.addTo(map);
  return foretScoreBox;
}

/**
 * Loads and displays the Forêt Score data
 * @param {string} csvUrl - URL to the CSV containing Forêt Score data
 */
async function loadAndDisplayForetScore(csvUrl) {
  try {
    const response = await fetch(csvUrl);
    const text = await response.text();
    const [code, duree, surfaceTotal, surfaceBoisee, tauxBoisement, coupesHa, coupesPct] = text.trim().split(",").map(Number);

    const score = calculateForetScore(tauxBoisement, coupesPct);
    updateForetScoreDisplay(score, surfaceTotal, surfaceBoisee, tauxBoisement, coupesHa, coupesPct);
  } catch (err) {
    console.error("Erreur lors du chargement du CSV ou du calcul du Forêt-Score :", err);
  }
}

/**
 * Calculates the Forêt Score based on forest coverage and cutting percentage
 * @param {number} boisement - Forest coverage percentage 
 * @param {number} coupesPct - Annual cutting percentage
 * @returns {string} The calculated Forêt Score (A-E)
 */
function calculateForetScore(boisement, coupesPct) {
  const scoreBoisement = SCORE_THRESHOLDS.boisement.find(threshold => boisement >= threshold.min).score;
  const scoreCoupes = SCORE_THRESHOLDS.coupesPct.find(threshold => coupesPct < threshold.max).score;

  // Take the worst of the two (i.e., max letter)
  return scoreBoisement > scoreCoupes ? scoreBoisement : scoreCoupes;
}

/**
 * Updates the UI with Forêt Score data
 * @param {string} score - The calculated Forêt Score (A-E)
 * @param {number} surfaceTotal - Total area in hectares
 * @param {number} surfaceBoisee - Forested area in hectares
 * @param {number} tauxBoisement - Forest coverage percentage
 * @param {number} coupesHa - Annual cutting in hectares
 * @param {number} coupesPct - Annual cutting percentage
 */
function updateForetScoreDisplay(score, surfaceTotal, surfaceBoisee, tauxBoisement, coupesHa, coupesPct) {
  const imgEl = document.getElementById("foret-score-img");
  if (imgEl) {
    imgEl.src = `assets/Foret-Score-${score}.svg`;
    imgEl.alt = `Score ${score}`;
  }

  const detailsEl = document.getElementById("foret-score-details");
  if (detailsEl) {
    detailsEl.innerHTML = `
      <b>Surface :</b>  ${Math.round(surfaceTotal).toLocaleString()} ha<br>
      <b>Dont forêt :</b>  ${Math.round(surfaceBoisee).toLocaleString()} ha (${tauxBoisement.toFixed(0)} %)<br>
      <b>Coupes :</b> ${coupesHa.toFixed(2)} ha / an (${coupesPct.toFixed(2)} % / an)
    `;
  }
}
