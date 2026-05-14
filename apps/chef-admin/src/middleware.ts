import { createAuthMiddleware } from '@ridendine/auth/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/privacy',
    '/terms',
    '/api/health',
    // E2E walkthrough fix: without these, the chef-admin login API
    // returned HTTP 307 from the middleware (auth/login page form posts
    // to /api/auth/login which the default-protect mode flagged as
    // requiring a session — chicken-and-egg).
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/forgot-password',
  ],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/',
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
