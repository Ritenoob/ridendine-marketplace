export default function CustomersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-72 rounded bg-surfaceMuted" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-surfaceMuted" />
            <div className="mt-3 h-9 w-20 rounded bg-surfaceMuted" />
            <div className="mt-2 h-3 w-16 rounded bg-surfaceMuted" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-divider bg-white shadow-sm">
        <div className="border-b border-divider px-5 py-4">
          <div className="h-5 w-32 rounded bg-surfaceMuted" />
        </div>
        <div className="divide-y divide-divider">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-surfaceMuted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-surfaceMuted" />
                <div className="h-3 w-24 rounded bg-surfaceMuted" />
              </div>
              <div className="h-4 w-16 rounded bg-surfaceMuted" />
              <div className="h-4 w-16 rounded bg-surfaceMuted" />
              <div className="h-6 w-20 rounded-full bg-surfaceMuted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
