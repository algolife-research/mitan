export default function DetailsPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Détails sur les données</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            Comme pour toutes les données, il est important de connaître leurs limites afin de mieux
            comprendre ce qu&apos;elles peuvent vraiment nous révéler.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Limites de la classification des types de forêts</h2>

          <p>
            La classification des types de forêts (et leur localisation) provient de la base de données{' '}
            <a href="https://geoservices.ign.fr/bdforet" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
              BDForêt® V2
            </a>{' '}
            de l&apos;IGN. Celle-ci est générée via un processus semi-automatisé, qui, bien que fiable,
            comporte quelques imprécisions, notamment :
          </p>

          <ul className="list-disc list-inside space-y-3">
            <li>
              BDForêt repose sur des relevés et des informations générées sur plusieurs années. Or, les
              forêts évoluent rapidement sous l&apos;effet des interventions humaines (exploitation forestière,
              urbanisation) ou naturelles (tempêtes, incendies). Cela signifie que les informations fournies
              peuvent ne pas toujours refléter la situation actuelle sur le terrain.
            </li>
            <li>
              La classification des types de forêts peut manquer de précision dans certaines zones. Par exemple,
              les types de forêts mixtes ou les forêts en transition peuvent être mal identifiés ou classés dans
              des catégories génériques. De plus, les petites parcelles forestières ou les forêts linéaires
              (comme les haies forestières) peuvent être mal représentées, voire omises.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Limites de la détection des perturbations</h2>

          <p>
            La détection des perturbations majeures de l&apos;écosystème forestier, même si elle repose sur un
            algorithme développé avec soin et passion en Limousin, présente aussi certaines limites :
          </p>

          <ul className="list-disc list-inside space-y-3">
            <li>
              <strong>Résolution temporelle et spatiale :</strong> Avec une résolution de 10 mètres,{' '}
              <a href="https://sentiwiki.copernicus.eu/web/s2-mission" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Sentinel-2
              </a>{' '}
              permet de détecter des changements dans la végétation, mais peut manquer les petites coupes
              rases ou perturbations locales. Sa fréquence de passage (5 jours) peut également ne pas capter
              des événements temporaires ou survenus entre deux images.
            </li>
            <li>
              <strong>Conditions météorologiques :</strong> Les images satellite peuvent être altérées par des
              nuages ou de la brume, surtout dans les zones humides. Même avec des corrections, certaines
              zones restent difficiles à observer précisément.
            </li>
            <li>
              <strong>Limites de l&apos;indice NDVI :</strong> Bien que bon indicateur de la végétation, le NDVI
              peine à distinguer les coupes rases d&apos;autres perturbations (maladies, incendies). Dans les
              zones à végétation clairsemée ou feuillage persistant, il peut mal interpréter les variations.
            </li>
            <li>
              <strong>Réactivité aux changements subtils :</strong> Le NDVI détecte bien les changements
              majeurs, mais est moins performant pour les coupes sélectives ou les perturbations progressives,
              qui peuvent être masquées par la régénération rapide de la végétation.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Source des données</h2>

          <ul className="list-disc list-inside space-y-3">
            <li>
              <strong>Annotation des forêts :</strong>{' '}
              <a href="https://geoservices.ign.fr/bdforet" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                BDForêt® V2
              </a>{' '}
              sous{' '}
              <a href="https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Licence ETALAB-Licence-Ouverte-v2.0
              </a>
            </li>
            <li>
              <strong>Couches de base et altitudes :</strong>{' '}
              Fond, Hydrographie, BDForêt V2, Espaces Protégés © IGN/Géoplateforme.{' '}
              <a href="https://geoservices.ign.fr/services-geoplateforme-altimetrie" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Service Géoplateforme de calcul altimétrique
              </a>{' '}
              sous{' '}
              <a href="https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Licence ETALAB-Licence-Ouverte-v2.0
              </a>
            </li>
            <li>
              <strong>Données satellite :</strong>{' '}
              Copernicus (
              <a href="https://sentiwiki.copernicus.eu/web/s2-mission" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                satellite Sentinel 2
              </a>
              ) obtenues par{' '}
              <a href="https://www.sentinel-hub.com/" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Sentinel-Hub
              </a>
              , sous{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Licence CC-BY-SA
              </a>
            </li>
            <li>
              <strong>Fond de carte :</strong> IGN-F / Geoportail
            </li>
            <li>
              <strong>Perturbations et calculs associés :</strong>{' '}
              <a href="https://ieeexplore.ieee.org/abstract/document/10604724" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                S. Mermoz et al.
              </a>{' '}
              sous{' '}
              <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Licence CC-BY-NC
              </a>
              , et algorithme maison sous{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                Licence CC-BY-SA
              </a>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Comment est calculé le Forêt-Score ?</h2>

          <p>
            Les détails concernant le calcul du score peuvent être retrouvés sur la page{' '}
            <a href="/foret-score" className="text-secondary hover:underline">Forêt-Score</a>.
            En résumé, il dépend de plusieurs composantes : Taux de boisement, Taux de coupes forestières,
            et bientôt Taux de coupes en espaces à haute valeur environnementale et Taux de monocultures.
          </p>
        </div>
      </div>
    </div>
  );
}
