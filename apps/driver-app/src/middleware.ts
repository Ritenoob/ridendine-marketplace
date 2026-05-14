import { createAuthMiddleware } from '@ridendine/auth/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/auth/login',
    '/auth/signup',
    '/api/auth/login',
    '/api/auth/signup',
    // Health endpoint must be reachable by external uptime monitors.
    '/api/health',
    // Legal pages must be reachable from the login screen / new-driver onboarding.
    '/privacy',
    '/terms',
  ],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/',
});

export const config = {
  matcher: [
    // Skip middleware for static assets, Next.js internals, AND PWA assets.
    // Before this exclusion, /sw.js / /manifest.json / /manifest.webmanifest /
    // /offline.html all triggered the auth-redirect because the matcher only
    // skipped images. The browser's service-worker registration would then
    // 307 to /auth/login and PWA install / offline mode silently broke.
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json|webmanifest|html)$).*)',
  ],
};
