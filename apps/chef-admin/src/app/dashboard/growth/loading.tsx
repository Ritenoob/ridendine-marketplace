export default function GrowthLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-64 rounded bg-surfaceMuted" />
        </div>
        <div className="flex gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-9 w-20 rounded-lg bg-surfaceMuted" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-surfaceMuted" />
            <div className="mt-3 h-9 w-24 rounded bg-surfaceMuted" />
            <div className="mt-2 h-3 w-20 rounded bg-surfaceMuted" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="h-5 w-40 rounded bg-surfaceMuted" />
        <div className="mt-4 flex h-48 items-end gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-surfaceMuted"
              style={{ height: `${30 + i * 8}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
