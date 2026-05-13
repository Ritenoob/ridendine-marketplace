import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getChefBasicContext } from '@/lib/engine';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // C.1 / A1 — only users who own a chef_profiles row reach the chef dashboard
  // chrome. Pending chefs are allowed (onboarding flow). Customers, drivers, and
  // ops users are redirected to login. Per-page `getChefActorContext` still
  // enforces `status === 'approved'` for privileged operations.
  const ctx = await getChefBasicContext();
  if (!ctx) {
    redirect('/auth/login?redirect=/dashboard');
  }

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
