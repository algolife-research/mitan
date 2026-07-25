import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, GITHUB_URL, SUPPORT_PLATFORMS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Soutenir Mitan, observatoire indépendant des coupes rases | Mitan',
  description:
    'Mitan est un projet bénévole et indépendant, porté par une seule personne. Vous pouvez le soutenir par un don (Tipeee), un partage de données ou un message.',
  alternates: { canonical: '/soutenir' },
};

export default function SoutenirPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Soutenir Mitan 💚</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Un projet bénévole, porté par une seule personne</h2>
          <p>
            Derrière Mitan, il n&apos;y a pas d&apos;entreprise, pas d&apos;équipe, pas de subvention.
            Une seule personne conçoit, développe et maintient ce site bénévolement, sur son temps
            libre, depuis le Limousin.
          </p>
          <p>
            Le projet doit beaucoup aux échanges avec le Réseau Forêt Limousine : l&apos;idée du
            Forêt-Score, en particulier, est née de ces discussions.
          </p>
          <p>
            L&apos;idée de départ est simple : chacun devrait pouvoir savoir comment évolue la forêt
            autour de chez soi. Le site est donc <strong>gratuit, sans publicité et sans pistage
            commercial</strong>, et il le restera.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Gratuit et indépendant</h2>
          <p>
            Le débat sur la forêt française est vif. Mitan n&apos;est financé par aucun de ses
            acteurs : ni la filière bois, ni les associations ou ONG, ni aucune institution.
          </p>
          <p>
            Autant le dire clairement : depuis son lancement, le site a reçu des pressions des deux
            côtés, chacun souhaitant le voir pencher dans son sens. La réponse est la même pour
            tous. Les données sont publiées telles quelles et chacun en tire ses propres
            conclusions. Mitan porte bien son nom : le mitan, c&apos;est le milieu.
          </p>
          <p>
            Aucun soutien qui conditionnerait ce que le site montre ne sera accepté. Ce sont les
            dons de particuliers qui garantissent cette indépendance.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Pourquoi un soutien ?</h2>
          <p>Faire tourner Mitan a un coût :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>le traitement des images satellite (Sentinel-2) sur l&apos;ensemble des communes couvertes ;</li>
            <li>l&apos;hébergement du site et le stockage des données ;</li>
            <li>le nom de domaine ;</li>
            <li>et de nombreuses heures de développement, d&apos;analyse et de maintenance.</li>
          </ul>
          <p>
            Les détections de perturbations s&apos;appuient sur les travaux de{' '}
            <a
              href="https://ieeexplore.ieee.org/abstract/document/10604724"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              S. Mermoz et al.
            </a>
            , et les données brutes viennent du programme européen Copernicus (Sentinel-2) et de
            l&apos;IGN. Mitan les rassemble, les traite et les rend lisibles, commune par commune.
            Toutes les sources sont créditées sur la page{' '}
            <Link href="/details" className="text-secondary hover:underline">Détails sur les données</Link>.
          </p>
          <p>
            Un point important : le jeu de données de S. Mermoz et al. s&apos;arrête en septembre
            2025. Pour mettre à jour les détections au-delà, il faudra un financement dédié, ou des
            partenaires prêts à partager leurs données. Si vous pouvez aider sur l&apos;un ou
            l&apos;autre, écrivez à Alexandre :{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary hover:underline">{CONTACT_EMAIL}</a>.
          </p>
          <p>
            Chaque contribution, même modeste, aide à couvrir ces frais et à dégager du temps pour
            le projet.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Et ensuite ?</h2>
          <p>Avec un financement suffisant, d&apos;autres chantiers pourront s&apos;ouvrir :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>reprendre la mise à jour des détections au-delà de septembre 2025 ;</li>
            <li>étudier l&apos;impact des perturbations forestières sur l&apos;eau potable ;</li>
            <li>ajouter un volet eau, pour suivre cette ressource comme on suit la forêt ;</li>
            <li>intégrer des données naturalistes (faune, flore) au portrait de chaque commune ;</li>
            <li>ouvrir un volet humain et social : recueillir des témoignages sur le lien entre les gens et leur milieu naturel.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Faire un don</h2>
          <p>Vous pouvez soutenir Mitan, ponctuellement ou chaque mois, via :</p>
          <div className="flex flex-col sm:flex-row gap-4 not-prose">
            {SUPPORT_PLATFORMS.map(({ name, url, tagline }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 block bg-secondary hover:bg-secondary-hover text-white rounded-lg px-6 py-4 text-center transition-colors"
              >
                <span className="block text-lg font-semibold">💚 {name}</span>
                <span className="block text-sm text-white/90 mt-1">{tagline}</span>
              </a>
            ))}
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">D&apos;autres façons d&apos;aider</h2>
          <p>L&apos;argent n&apos;est pas la seule façon d&apos;aider :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Parlez de Mitan autour de vous</strong> : à vos proches, votre commune, vos
              associations locales. Plus le site est utilisé, plus il est utile.
            </li>
            <li>
              <strong>Signalez un bug, proposez une idée, partagez des données</strong> : écrivez à
              Alexandre, à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary hover:underline">{CONTACT_EMAIL}</a>.
              Chaque message est lu, et un mot gentil fait toujours plaisir : il n&apos;y a
              qu&apos;une personne derrière l&apos;écran.
            </li>
            <li>
              <strong>Contribuez au code</strong> : le projet est ouvert et disponible sur{' '}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                GitHub
              </a>. Les contributions sont les bienvenues.
            </li>
          </ul>

          <p className="mt-8">
            Merci pour votre soutien, quelle que soit sa forme.
          </p>
          <p>
            <Link href="/mentions" className="text-secondary hover:underline">
              → Consulter les mentions légales
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
