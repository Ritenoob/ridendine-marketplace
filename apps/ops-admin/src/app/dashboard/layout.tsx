import { redirect } from 'next/navigation';
import { getOpsActorContext } from '@/lib/engine';

export default async function DashboardAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getOpsActorContext();

  if (!actor) {
    redirect('/auth/login?redirect=/dashboard');
  }

  return children;
}
