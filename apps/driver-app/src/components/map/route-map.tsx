'use client';

import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

interface RouteMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress?: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffAddress?: string;
  driverLat?: number | null;
  driverLng?: number | null;
  className?: string;
}

interface RoutePoint {
  label: string;
  detail: string;
  coordinate: string;
  tone: 'pickup' | 'dropoff' | 'driver';
}

function hasCoordinate(lat?: number | null, lng?: number | null): lat is number {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
  );
}

function formatCoordinate(lat?: number | null, lng?: number | null) {
  if (!hasCoordinate(lat, lng)) return 'Location pending';
  return `${lat.toFixed(5)}, ${lng!.toFixed(5)}`;
}

function RoutePin({ tone }: { tone: RoutePoint['tone'] }) {
  const toneClass =
    tone === 'pickup'
      ? 'bg-success'
      : tone === 'dropoff'
        ? 'bg-danger'
        : 'bg-info';

  return (
    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass} text-white shadow-sm`}>
      <span className="h-2.5 w-2.5 rounded-full bg-white" />
    </span>
  );
}

export function RouteMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  dropoffLat,
  dropoffLng,
  dropoffAddress,
  driverLat,
  driverLng,
  className,
}: RouteMapProps) {
  const points: RoutePoint[] = [
    ...(hasCoordinate(driverLat, driverLng)
      ? [
          {
            label: 'Driver',
            detail: 'Current GPS fix',
            coordinate: formatCoordinate(driverLat, driverLng),
            tone: 'driver' as const,
          },
        ]
      : []),
    {
      label: 'Pickup',
      detail: pickupAddress || 'Restaurant address pending',
      coordinate: formatCoordinate(pickupLat, pickupLng),
      tone: 'pickup',
    },
    {
      label: 'Dropoff',
      detail: dropoffAddress || 'Customer address pending',
      coordinate: formatCoordinate(dropoffLat, dropoffLng),
      tone: 'dropoff',
    },
  ];

  const center = hasCoordinate(pickupLat, pickupLng)
    ? formatCoordinate(pickupLat, pickupLng)
    : hasCoordinate(dropoffLat, dropoffLng)
      ? formatCoordinate(dropoffLat, dropoffLng)
      : formatCoordinate(DEFAULT_SERVICE_REGION_CENTER[0], DEFAULT_SERVICE_REGION_CENTER[1]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-divider bg-surfaceMuted ${className ?? ''}`}
      data-testid="route-map"
      aria-label="Delivery route summary"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(234,91,38,0.08)_0%,rgba(34,197,94,0.08)_52%,rgba(59,130,246,0.08)_100%)]" />
      <div className="absolute inset-x-6 top-1/2 h-px bg-borderStrong" />

      <div className="relative flex h-full min-h-52 flex-col justify-between p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-textMuted">Route center</p>
            <p className="mt-1 text-sm font-bold text-text">{center}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-textMuted shadow-sm">
            {points.length} stops
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {points.map((point) => (
            <div key={`${point.label}-${point.coordinate}`} className="rounded-xl border border-divider bg-white/95 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <RoutePin tone={point.tone} />
                <div>
                  <p className="text-sm font-bold text-text">{point.label}</p>
                  <p className="text-xs text-textSubtle">{point.coordinate}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-textMuted">{point.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
