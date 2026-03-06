import type { NextConfig } from 'next';

const isExport = process.env.NEXT_OUTPUT === 'export';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  ...(isExport ? { output: 'export' } : {}),
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
