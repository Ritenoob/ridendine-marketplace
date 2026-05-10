import { createAuthMiddleware } from '@ridendine/auth/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/privacy',
    '/terms',
    '/api/health',
  ],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/',
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
