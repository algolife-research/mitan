'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONTACT_EMAIL } from '@/lib/constants';

export function Footer() {
  const pathname = usePathname();

  // La carte occupe tout l'écran : pas de footer sur cette page
  if (pathname === '/carte') return null;

  return (
    <footer className="bg-primary text-mitan-light">
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center space-y-4">
        <p className="text-sm">
          Mitan est un projet <strong>bénévole et indépendant</strong>, porté par une seule personne.
          <br className="hidden sm:block" />
          {' '}Gratuit et sans publicité, il ne vit que grâce à vous.
        </p>
        <Link
          href="/soutenir"
          className="inline-block bg-secondary hover:bg-secondary-hover text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
        >
          💚 Soutenir le projet
        </Link>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-mitan-light/80">
          <Link href="/mentions" className="hover:text-secondary transition-colors">Mentions légales</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-secondary transition-colors">
            Écrire à Alexandre
          </a>
        </div>
      </div>
    </footer>
  );
}
