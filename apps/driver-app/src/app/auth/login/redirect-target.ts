export function resolveDriverRedirectTarget(value: string | null): string {
  if (!value) return '/';

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  if (trimmed.includes('\\')) return '/';

  const path = trimmed.split(/[?#]/)[0] ?? '';
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return '/';

  return trimmed;
}
