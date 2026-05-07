export default function MenuLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-8 w-20 rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
        </div>
      </div>

      {/* Action buttons row */}
      <div className="mt-6 flex gap-2">
        <div className="h-10 w-32 rounded-lg bg-gray-200" />
        <div className="h-10 w-24 rounded-lg bg-gray-200" />
      </div>

      {/* Category cards */}
      <div className="mt-6 space-y-6">
        {[1, 2].map((cat) => (
          <div key={cat} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {/* Category header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="h-5 w-32 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-48 rounded bg-gray-200" />
              </div>
              <div className="h-10 w-20 rounded-lg bg-gray-200" />
            </div>

            {/* Menu item rows */}
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-200" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 rounded bg-gray-200" />
                      <div className="h-3 w-52 rounded bg-gray-200" />
                      <div className="h-3 w-16 rounded bg-gray-200" />
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-20 rounded-full bg-gray-200" />
                    <div className="h-8 w-14 rounded-lg bg-gray-200" />
                    <div className="h-8 w-16 rounded-lg bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
