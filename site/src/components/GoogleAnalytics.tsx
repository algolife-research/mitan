'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const GA_ID = 'G-15Y9KY6LVP';
const CONSENT_KEY = 'mitan_cookie_consent';

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => {
      setEnabled(localStorage.getItem(CONSENT_KEY) === 'accepted');
    };
    check();

    // Listen for cross-tab changes
    const storageHandler = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) check();
    };
    // Listen for same-tab changes (dispatched by CookieConsent)
    const consentHandler = () => check();

    window.addEventListener('storage', storageHandler);
    window.addEventListener('cookie-consent-change', consentHandler);
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('cookie-consent-change', consentHandler);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
