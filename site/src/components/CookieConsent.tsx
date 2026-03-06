'use client';

import { useState, useEffect, useCallback } from 'react';

const CONSENT_KEY = 'mitan_cookie_consent';

type ConsentValue = 'accepted' | 'rejected' | null;

function getStoredConsent(): ConsentValue {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'accepted' || val === 'rejected') return val;
  return null;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentValue>(null);

  useEffect(() => {
    setConsent(getStoredConsent());
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsent('accepted');
    window.dispatchEvent(new Event('cookie-consent-change'));
  }, []);

  const reject = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setConsent('rejected');
    window.dispatchEvent(new Event('cookie-consent-change'));
  }, []);

  return { consent, accept, reject };
}

export function CookieConsent() {
  const { consent, accept, reject } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Don't render during SSR or if consent already given
  if (!mounted || consent !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-lg px-4 py-4 md:px-8">
      <div className="container mx-auto max-w-4xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 text-sm text-gray-700">
          <p>
            Nous utilisons des cookies analytiques pour améliorer votre expérience et analyser le trafic du site.
            Aucune donnée personnelle n&apos;est collectée à des fins publicitaires.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Rejeter
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
