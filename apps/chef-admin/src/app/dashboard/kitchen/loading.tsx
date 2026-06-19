export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-80 rounded bg-surfaceMuted" />
        </div>
        <div className="h-9 w-20 rounded-lg bg-surfaceMuted" />
      </div>
      <div className="rounded-xl border border-divider bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-5 w-32 rounded bg-surfaceMuted" />
            <div className="h-4 w-56 rounded bg-surfaceMuted" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-surfaceMuted" />
        </div>
      </div>
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="h-5 w-40 rounded bg-surfaceMuted" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-5 w-5 rounded bg-surfaceMuted" />
              <div className="h-4 flex-1 rounded bg-surfaceMuted" />
              <div className="h-4 w-12 rounded bg-surfaceMuted" />
              <div className="h-4 w-10 rounded bg-surfaceMuted" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-divider bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-surfaceMuted" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-surfaceMuted" />
                <div className="h-3 w-20 rounded bg-surfaceMuted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
