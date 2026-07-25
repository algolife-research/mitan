import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, GITHUB_URL, SUPPORT_PLATFORMS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Soutenir Mitan - Notre milieu',
  description:
    'Mitan est un projet bénévole et indépendant, porté par une seule personne. Découvrez comment soutenir le projet.',
};

export default function SoutenirPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Soutenir Mitan 💚</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Un projet bénévole, porté par une seule personne</h2>
          <p>
            Derrière Mitan, il n&apos;y a ni grande entreprise, ni équipe de salariés, ni subvention :
            juste <strong>une seule personne</strong>, qui conçoit, développe et maintient ce site
            bénévolement, sur son temps libre, au cœur du Limousin.
          </p>
          <p>
            Mitan est né d&apos;une conviction : chacun et chacune devrait pouvoir savoir, simplement,
            comment évolue la forêt autour de chez soi. C&apos;est pourquoi le site est{' '}
            <strong>gratuit, sans publicité et sans pistage commercial</strong> &mdash; et il le restera.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Pourquoi un soutien ?</h2>
          <p>Faire vivre Mitan a un coût bien réel :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>le traitement des images satellite (Sentinel-2) sur l&apos;ensemble des communes couvertes ;</li>
            <li>l&apos;hébergement du site et le stockage des données ;</li>
            <li>le nom de domaine ;</li>
            <li>et surtout de nombreuses heures de développement, d&apos;analyse et de maintenance.</li>
          </ul>
          <p>
            Chaque contribution, même modeste, aide à couvrir ces frais, à pérenniser le projet et à
            dégager du temps pour de nouvelles fonctionnalités (nouvelles données, nouveaux territoires,
            nouveaux outils d&apos;analyse&hellip;).
          </p>

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
          <p>Le soutien n&apos;est pas qu&apos;une question d&apos;argent, loin de là :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Parlez de Mitan autour de vous</strong> : à vos proches, votre commune, vos
              associations locales. Plus le site est utilisé, plus il est utile.
            </li>
            <li>
              <strong>Signalez un problème ou proposez une idée</strong> en écrivant à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary hover:underline">{CONTACT_EMAIL}</a>.
            </li>
            <li>
              <strong>Contribuez au code</strong> : le projet est ouvert et disponible sur{' '}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                GitHub
              </a>{' '}
              &mdash; les étoiles, retours et contributions sont les bienvenus.
            </li>
          </ul>

          <p className="mt-8">
            Merci du fond du cœur pour votre soutien, quelle que soit sa forme. 🌳
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
