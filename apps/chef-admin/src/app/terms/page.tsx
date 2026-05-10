import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | RideNDine Chef',
};

export default function ChefTermsPage() {
  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <Link href="/auth/signup" className="text-sm font-semibold text-[#E85D26] hover:text-[#D04D16]">
          Back to chef signup
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-950">Chef Terms of Service</h1>
        <p className="mt-3 text-sm text-gray-500">RideNDine chef portal terms summary.</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-950">Chef responsibilities</h2>
            <p className="mt-2">
              Chefs are responsible for accurate storefront information, safe food preparation, menu accuracy, order fulfillment, availability settings, and compliance with applicable food business rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Orders and operations</h2>
            <p className="mt-2">
              You agree to keep order statuses current, prepare orders within committed times, communicate operational issues promptly, and follow RideNDine platform workflows for cancellations, refunds, and exceptions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Payouts</h2>
            <p className="mt-2">
              Payouts depend on completed orders, ledger adjustments, payment processor status, and any required holds, refunds, or compliance review.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Main customer terms</h2>
            <p className="mt-2">
              The customer-facing terms remain available at{' '}
              <a href="https://ridendine.ca/terms" className="font-semibold text-[#E85D26] hover:text-[#D04D16]">
                ridendine.ca/terms
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
