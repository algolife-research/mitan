import Image from 'next/image';

export default function ForetScorePage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Le Forêt-Score</h1>
        <p className="text-lg text-gray-600 mb-4">
          Un indicateur de santé et résilience des forêts
        </p>

        <div className="flex justify-center my-8">
          <Image src="/Foret-Score-A.svg" alt="Forêt-Score A" width={120} height={120} />
        </div>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            Le <strong>Forêt-Score</strong> est un indicateur destiné à évaluer la qualité et la
            durabilité des forêts d&apos;une commune, à l&apos;image du Nutri-Score pour l&apos;alimentation.
            Il repose sur plusieurs <strong>critères</strong> liés à la <strong>gestion forestière</strong>,
            aux <strong>pratiques d&apos;exploitation</strong> et à la <strong>préservation de la biodiversité</strong>.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Interprétation du Forêt-Score</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Catégorie</th>
                  <th className="py-3 px-4 text-center">Signification</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4 text-center">
                    <Image src="/Foret-Score-A.svg" alt="Score A" width={80} height={80} className="inline-block" />
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-green-700">A (Excellent)</td>
                  <td className="py-4 px-4">Forêt globalement bien gérée et résiliente</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4 text-center">
                    <Image src="/Foret-Score-B.svg" alt="Score B" width={80} height={80} className="inline-block" />
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-lime-600">B (Bon)</td>
                  <td className="py-4 px-4">Bonne gestion, mais avec des axes d&apos;amélioration à considérer</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4 text-center">
                    <Image src="/Foret-Score-C.svg" alt="Score C" width={80} height={80} className="inline-block" />
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-yellow-600">C (Moyen)</td>
                  <td className="py-4 px-4">Gestion moyenne et équilibre fragile, vigilance nécessaire, présence de risques écologiques</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4 text-center">
                    <Image src="/Foret-Score-D.svg" alt="Score D" width={80} height={80} className="inline-block" />
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-orange-600">D (Médiocre)</td>
                  <td className="py-4 px-4">Pression excessive sur la forêt, impact sur l&apos;environnement et l&apos;avenir de la filière</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4 text-center">
                    <Image src="/Foret-Score-E.svg" alt="Score E" width={80} height={80} className="inline-block" />
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-red-600">E (Critique)</td>
                  <td className="py-4 px-4">Forêt surexploitée ou gravement menacée, perte de valeur durable sans action rapide</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Composantes du score</h2>

          <p>Le score est actuellement basé sur deux variables :</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6">Taux de boisement</h3>
          <p>
            Représente la proportion de la surface forestière par rapport à la surface totale d&apos;un territoire.
            Un taux élevé est généralement préférable, sauf en cas de surexploitation ou de monoculture excessive.
          </p>
          <p>Échelle : 0 % (pas de forêt) à 100 % (territoire entièrement boisé).</p>

          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <table className="w-full">
              <tbody>
                <tr><td className="py-1 font-semibold text-green-700 w-12">A</td><td className="py-1">Taux de boisement &ge; 60 %</td></tr>
                <tr><td className="py-1 font-semibold text-lime-600">B</td><td className="py-1">Taux de boisement &ge; 40 %</td></tr>
                <tr><td className="py-1 font-semibold text-yellow-600">C</td><td className="py-1">Taux de boisement &ge; 20 %</td></tr>
                <tr><td className="py-1 font-semibold text-orange-600">D</td><td className="py-1">Taux de boisement &ge; 10 %</td></tr>
                <tr><td className="py-1 font-semibold text-red-600">E</td><td className="py-1">Taux de boisement &lt; 10 %</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mt-6">Taux de coupes rases</h3>
          <p>
            Indique la part de la forêt soumise à des coupes rases (extraction totale du couvert forestier
            sur une surface donnée). Un faible taux est préférable pour la biodiversité et la résilience écologique.
          </p>
          <p>Échelle : 0 % (aucune coupe rase) à 3 % et plus (forte pression).</p>

          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <table className="w-full">
              <tbody>
                <tr><td className="py-1 font-semibold text-green-700 w-12">A</td><td className="py-1">Taux de coupes &lt; 0,1 % par an</td></tr>
                <tr><td className="py-1 font-semibold text-lime-600">B</td><td className="py-1">Taux de coupes &lt; 0,2 % par an</td></tr>
                <tr><td className="py-1 font-semibold text-yellow-600">C</td><td className="py-1">Taux de coupes &lt; 0,5 % par an</td></tr>
                <tr><td className="py-1 font-semibold text-orange-600">D</td><td className="py-1">Taux de coupes &lt; 1,2 % par an</td></tr>
                <tr><td className="py-1 font-semibold text-red-600">E</td><td className="py-1">Taux de coupes &ge; 1,2 % par an</td></tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6">Le score sera bientôt enrichi par ces deux variables :</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6">[À venir] Taux de coupes en espaces à haute valeur environnementale</h3>
          <p>
            Mesure la part des zones forestières protégées (Natura 2000, réserves naturelles, ZNIEFF, etc.)
            ayant subi des coupes rases.
          </p>
          <p>Échelle : 0 % (aucune coupe en zone protégée) à 1 % et plus (forte pression).</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6">[À venir] Taux de monocultures</h3>
          <p>
            Correspond à la proportion approximative de forêt plantée après exploitation ou déforestation.
            Un bon équilibre entre régénération naturelle et plantation contrôlée est crucial.
          </p>
          <p>Échelle : 0 % (pure forêt plantée mixte ou naturelle) à 100 % (monocultures).</p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Calcul du Forêt-Score</h2>

          <p>Chaque composante est évaluée sur une échelle de A (Excellent) à E (Critique).</p>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="font-semibold text-gray-900">
              Le score final est le plus bas des scores obtenus à chaque composante.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Exemple : Si une forêt obtient A en boisement, B en coupes rases, C en espaces protégés,
              mais E en taux de plantation, le Forêt-Score sera <strong>E</strong>.
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            <em>Note : Le Forêt-Score est un outil indicatif destiné à sensibiliser aux enjeux forestiers.
            Il ne remplace pas les diagnostics forestiers professionnels.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
