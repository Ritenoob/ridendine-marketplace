import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

// NOTE: The redirect-based role check that briefly lived here (Phase C of
// the 2026-05-13 stabilization pass) caused a redirect loop on chef.ridendine.ca:
// /dashboard → /auth/login → middleware sees session → / → /dashboard → ...
// because chef-admin's root page (apps/chef-admin/src/app/page.tsx) redirects
// to /dashboard and the chef-admin middleware's authenticatedRedirect points
// at '/'. The dashboard page itself ([./page.tsx]) already renders a graceful
// state for "no chef profile / no storefront" via its own getChefContext
// helper, and every privileged API route enforces getChefActorContext which
// requires status='approved'. Role-gating belongs in Phase D — likely via a
// dedicated /onboarding entry route or a "you don't have a chef account" page,
// not via an in-layout redirect that fights the middleware.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
