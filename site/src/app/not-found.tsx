import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page introuvable</h2>
        <p className="text-gray-600 mb-8">Cette page n&apos;a pas été trouvée.</p>
        <Link
          href="/"
          className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-medium transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
