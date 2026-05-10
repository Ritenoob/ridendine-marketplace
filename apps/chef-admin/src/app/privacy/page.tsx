import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | RideNDine Chef',
};

export default function ChefPrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <Link href="/auth/signup" className="text-sm font-semibold text-[#E85D26] hover:text-[#D04D16]">
          Back to chef signup
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-950">Chef Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-500">RideNDine chef portal privacy summary.</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-950">Information we collect</h2>
            <p className="mt-2">
              We collect account, kitchen, menu, payout, availability, order, support, and compliance information needed to operate your storefront and process marketplace activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">How it is used</h2>
            <p className="mt-2">
              Chef data is used for onboarding, storefront display, customer ordering, kitchen operations, payouts, fraud prevention, support, compliance, analytics, and platform safety.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Sharing</h2>
            <p className="mt-2">
              Public storefront details may be shown to customers. Operational details may be shared with RideNDine ops, drivers, payment processors, and service providers when required to fulfill orders and payouts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Main customer policy</h2>
            <p className="mt-2">
              The customer-facing policy remains available at{' '}
              <a href="https://ridendine.ca/privacy" className="font-semibold text-[#E85D26] hover:text-[#D04D16]">
                ridendine.ca/privacy
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
