/** @type {import('next').NextConfig} */
const { loadRootEnv } = require('../../scripts/load-root-env.cjs');

loadRootEnv(__dirname);

const nextConfig = {
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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *.supabase.co; font-src 'self'; connect-src 'self' *.supabase.co api.stripe.com *.sentry.io; frame-src js.stripe.com; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
