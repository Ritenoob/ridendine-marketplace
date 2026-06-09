import { resolveDriverRedirectTarget } from '../app/auth/login/redirect-target';

describe('resolveDriverRedirectTarget', () => {
  it('allows safe same-origin app paths', () => {
    expect(resolveDriverRedirectTarget('/')).toBe('/');
    expect(resolveDriverRedirectTarget('/profile')).toBe('/profile');
    expect(resolveDriverRedirectTarget('/settings')).toBe('/settings');
  });

  it('normalizes legacy dashboard redirects to the driver home route', () => {
    expect(resolveDriverRedirectTarget('/dashboard')).toBe('/');
    expect(resolveDriverRedirectTarget('/dashboard?from=old-link')).toBe('/');
  });

  it('rejects external, protocol-relative, and empty redirects', () => {
    expect(resolveDriverRedirectTarget('https://example.com')).toBe('/');
    expect(resolveDriverRedirectTarget('//example.com')).toBe('/');
    expect(resolveDriverRedirectTarget('')).toBe('/');
    expect(resolveDriverRedirectTarget(null)).toBe('/');
  });
});
