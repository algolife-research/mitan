/**
 * Get a query parameter from the URL
 * @param {string} param - The parameter name to retrieve
 * @returns {string|null} The parameter value or null if not found
 */
export function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

// Core data constants
export const URL_COMMUNE_CODE = getQueryParam("commune");
export const COMMUNE_CODE = URL_COMMUNE_CODE || "defaultCode";
export const GEOJSON_URL = `https://geo.api.gouv.fr/communes?code=${COMMUNE_CODE}&geometry=contour&format=geojson`;
export const CSV_URL = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/STATS/${COMMUNE_CODE}_stats.csv`;
export const CR_URL = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/CR/${COMMUNE_CODE}_cr.tif`;

// Score thresholds
export const SCORE_THRESHOLDS = {
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

// Help content
export const HELP_CONTENT = `
  <b>Comment naviguer</b>
  <ul>
    <li><b>Cliquer sur la carte :</b> Obtenez des informations détaillées sur un endroit spécifique.</li>
    <li><b>Changer de commune :</b> Utilisez la barre de recherche ou cliquez sur la carte.</li>
    <li><b>Filtrer les coupes :</b> Cliquez sur une année du graphique pour filtrer les perturbations associées.</li>
    <li><b>Activer/Désactiver des couches :</b> Utilisez le menu en haut à gauche.</li>
  </ul>
  <br>
  <b>À savoir</b><br>
  Les <strong>perturbations</strong>, en rouge, sont des changements brutaux de la végétation détectées par satellite. Ce sont surtout des <strong>coupes rases et incendies</strong>.<br>
  Il est judicieux de se questionner face à des données : consultez la page <a href="details.html">Détails</a> pour en apprendre plus sur les limites des <b>processus automatisés</b> de classification des forêts et détection des perturbations.<br>

  <br><b>Sources</b>
  <br><b>Annotation des forêts</b><br>
  <a href="https://geoservices.ign.fr/bdforet" target="_blank">BDForêt® V2</a> sous <a href="https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf" target="_blank">Licence ETALAB-Licence-Ouverte-v2.0</a>
  <br><br>
  <b>Couches de base et altitudes</b><br>
  Fond, Hydrographie, BDForêt V2, Espaces Protégés © IGN/Géoplateforme<br>
  <a href="https://geoservices.ign.fr/services-geoplateforme-altimetrie" target="_blank">Service Géoplateforme de calcul altimétrique</a>
  <br><br>
  <b>Données satellite</b><br>
  Copernicus (<a href="https://sentiwiki.copernicus.eu/web/s2-mission" target="_blank">satellite Sentinel 2</a>) obtenues par <a href="https://www.sentinel-hub.com/" target="_blank">Sentinel-Hub</a>
`;

// Sources content
export const SOURCES_CONTENT = `
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
