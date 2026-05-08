import { createAuthMiddleware } from '@ridendine/auth/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: ['/auth/login', '/api/health', '/api/engine/processors', '/api/ops/live-board'],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/',
  authRoutes: [],
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
