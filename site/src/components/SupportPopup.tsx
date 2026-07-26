'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/constants';

const SEEN_KEY = 'mitan_support_popup_seen';
const CONSENT_KEY = 'mitan_cookie_consent';

/**
 * Popup de soutien, présent sur toutes les pages (monté dans le layout).
 * Affiché une fois par session (sessionStorage) pour rester visible sans harceler :
 * l'appel permanent reste dans la barre de navigation et le pied de page.
 * Séquencé après le choix cookies pour ne pas empiler deux fenêtres.
 */
export function SupportPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SEEN_KEY)) return;

    let timer: ReturnType<typeof setTimeout>;
    const show = (delay: number) => {
      timer = setTimeout(() => setVisible(true), delay);
    };

    if (localStorage.getItem(CONSENT_KEY)) {
      show(2500);
      return () => clearTimeout(timer);
    }

    const onConsent = () => {
      window.removeEventListener('cookie-consent-change', onConsent);
      show(800);
    };
    window.addEventListener('cookie-consent-change', onConsent);
    return () => {
      window.removeEventListener('cookie-consent-change', onConsent);
      clearTimeout(timer);
    };
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sessionStorage indisponible : on ferme quand même */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Soutenir Mitan"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Fermer"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-3">Mitan a besoin de vous 💚</h2>
        <p className="text-sm text-gray-700 mb-3">
          Mitan est un projet <strong>bénévole et indépendant</strong>, porté par une seule personne.
          Gratuit et sans publicité, il ne vit que grâce à vous.
        </p>
        <p className="text-sm text-gray-700 mb-4">
          Les détections de coupes rases s&apos;appuient sur un jeu de données qui{' '}
          <strong>s&apos;arrête en septembre 2025</strong>. Pour continuer à mettre la carte à jour,
          il faut <strong>un financement</strong> ou <strong>des partenaires prêts à partager leurs
          données</strong>.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            onClick={close}
            className="bg-secondary hover:bg-secondary-hover text-white text-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            💚 Nous écrire pour soutenir le projet
          </a>
          <Link
            href="/soutenir"
            onClick={close}
            className="text-center text-sm text-secondary hover:underline mt-1"
          >
            Toutes les façons de soutenir
          </Link>
        </div>

        <button
          onClick={close}
          className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
