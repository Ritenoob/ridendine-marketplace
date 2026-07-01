const PLACEHOLDER_PATTERN = /placeholder|your_|dummy|changeme|example|fake/i;

function hasUsableTestValue(value: string | undefined, prefix: string): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed?.startsWith(prefix) && !PLACEHOLDER_PATTERN.test(trimmed));
}

export function hasUsableStripeTestCredentials(): boolean {
  return (
    hasUsableTestValue(process.env.STRIPE_SECRET_KEY, 'sk_test_') &&
    hasUsableTestValue(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, 'pk_test_')
  );
}
