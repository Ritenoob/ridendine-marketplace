/** @type {import('next').NextConfig} */
const { loadRootEnv } = require('../../scripts/load-root-env.cjs');

loadRootEnv(__dirname);

const nextConfig = {
  // Don't advertise the framework (was leaking `X-Powered-By: Next.js`).
  poweredByHeader: false,
  transpilePackages: [
    '@ridendine/db',
    '@ridendine/ui',
    '@ridendine/auth',
    '@ridendine/types',
    '@ridendine/utils',
    '@ridendine/validation',
    '@ridendine/engine',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // NOTE: Content-Security-Policy is set per-request in src/middleware.ts
          // so it can include a unique nonce (removes the previous
          // 'unsafe-inline' / 'unsafe-eval' script weakness).
        ],
      },
    ];
  },
};

module.exports = nextConfig;
