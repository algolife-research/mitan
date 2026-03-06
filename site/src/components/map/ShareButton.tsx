'use client';

import { useState, useCallback } from 'react';

interface ShareButtonProps {
  communeName: string;
  communeCode: string;
}

export function ShareButton({ communeName, communeCode }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/carte?commune=${communeCode}`
    : '';

  const handleClick = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Mitan - ${communeName}`, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [communeName, shareUrl]);

  return (
    <button
      onClick={handleClick}
      className="bg-white px-3 py-2 rounded shadow-md hover:bg-gray-100 transition-colors text-sm font-medium"
      title="Copier le lien"
    >
      {copied ? (
        <span className="flex items-center gap-1 text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium">Lien copié !</span>
        </span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M13 4.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM13 15.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM2 10a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" />
          <path d="M7 9.03l4.3-2.57M7 10.97l4.3 2.57" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )}
    </button>
  );
}
