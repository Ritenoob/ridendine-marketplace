import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | RideNDine Driver',
};

export default function DriverTermsPage() {
  return (
    <main className="min-h-screen bg-opsCanvas px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <Link href="/auth/signup" className="text-sm font-semibold text-[#E85D26] hover:text-[#d44e1e]">
          Back to driver signup
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-950">Driver Terms of Service</h1>
        <p className="mt-3 text-sm text-gray-500">RideNDine driver app terms summary.</p>

        <div
          role="alert"
          className="mt-6 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-semibold">⚠️ DRAFT — Pending Legal Review</p>
          <p className="mt-1">
            This document is a working draft prepared by the RideNDine team and has{' '}
            <strong>not</strong> been reviewed by qualified legal counsel. It does not
            constitute legal advice, is not a binding contract, and is provided for
            informational purposes only during our closed beta. Final terms will be posted
            before public launch. Questions: legal@ridendine.ca.
          </p>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-950">Driver responsibilities</h2>
            <p className="mt-2">
              Drivers are responsible for accurate account and vehicle information, lawful operation, safe delivery conduct, prompt status updates, and following RideNDine dispatch workflows.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Deliveries</h2>
            <p className="mt-2">
              You agree to accept only offers you can complete, keep location/status data current, collect required proof of pickup or dropoff, and report delays or exceptions quickly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Payouts</h2>
            <p className="mt-2">
              Driver payouts depend on completed deliveries, ledger entries, tips, adjustments, instant payout rules, payment processor status, and any required review.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-950">Main customer terms</h2>
            <p className="mt-2">
              The customer-facing terms remain available at{' '}
              <a href="https://ridendine.ca/terms" className="font-semibold text-[#E85D26] hover:text-[#d44e1e]">
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
