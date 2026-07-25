import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE = 'https://aumitan.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/carte`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/foret-score`, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${BASE}/details`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE}/soutenir`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE}/communes`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/mentions`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
