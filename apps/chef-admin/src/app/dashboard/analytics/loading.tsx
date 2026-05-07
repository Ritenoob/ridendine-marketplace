export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header row with period toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-16 rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="mt-3 h-9 w-24 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Two chart cards side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-52 rounded bg-gray-200" />
          {/* Bar chart placeholder */}
          <div className="mt-4 flex h-48 items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gray-200"
                style={{ height: `${20 + Math.floor(Math.random() * 60)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-3 w-10 rounded bg-gray-200" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-56 rounded bg-gray-200" />
          {/* Hourly bar chart placeholder */}
          <div className="mt-4 flex h-48 items-end gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gray-200"
                style={{ height: `${10 + Math.floor(Math.random() * 70)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 w-10 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>

      {/* Top items card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="h-5 w-36 rounded bg-gray-200" />
        <div className="mt-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="h-3 w-28 rounded bg-gray-200" />
              </div>
              <div className="h-2 w-32 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
