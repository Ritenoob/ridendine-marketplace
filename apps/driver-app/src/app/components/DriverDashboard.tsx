'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Driver, Delivery } from '@ridendine/db';
import type { DriverOperationsSummary, DriverShiftOperationsSummary } from '@ridendine/types';
import { OfferAlert } from '@/components/offer-alert';
import { useLocationTracker } from '@/hooks/use-location-tracker';

interface DriverDashboardProps {
  driver: Driver;
  activeDeliveries: Delivery[];
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  en_route_to_pickup: 'En route to pickup',
  arrived_at_pickup: 'At restaurant',
  picked_up: 'Picked up',
  en_route_to_dropoff: 'En route to customer',
  arrived_at_dropoff: 'At customer',
};

function formatDeliveryStatus(status?: string | null) {
  if (!status) return 'In progress';
  return DELIVERY_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

function formatStatusLabel(status?: string | null) {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseReadinessSummary(json: unknown): DriverOperationsSummary | null {
  if (!json || typeof json !== 'object') return null;

  const root = json as Record<string, unknown>;
  const payload = root.success === true && root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;

  return payload.readiness && typeof payload.readiness === 'object'
    ? (payload as unknown as DriverOperationsSummary)
    : null;
}

function parseShiftSummary(json: unknown): DriverShiftOperationsSummary | null {
  if (!json || typeof json !== 'object') return null;

  const root = json as Record<string, unknown>;
  const payload = root.success === true && root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;

  return typeof payload.isOnShift === 'boolean'
    ? (payload as unknown as DriverShiftOperationsSummary)
    : null;
}

function formatGpsFreshness(
  serverLastLocationAt: string | null | undefined,
  clientLastPostedAt: string | null | undefined,
  hasClientFix: boolean
) {
  const timestamp = clientLastPostedAt ?? serverLastLocationAt;

  if (!timestamp) {
    return hasClientFix ? 'GPS fix captured, waiting to post' : 'No GPS fix yet';
  }

  const postedAt = Date.parse(timestamp);
  if (!Number.isFinite(postedAt)) {
    return 'GPS freshness unknown';
  }

  const ageMs = Date.now() - postedAt;
  if (ageMs < 0) return 'GPS timestamp is ahead of device time';
  if (ageMs < 60_000) return 'GPS refreshed just now';

  const ageMinutes = Math.round(ageMs / 60_000);
  if (ageMinutes < 60) return `GPS refreshed ${ageMinutes} min ago`;

  const ageHours = Math.round(ageMinutes / 60);
  return `GPS refreshed ${ageHours} hr ago`;
}

function shouldShowRetryLocation(
  summary: DriverOperationsSummary | null,
  permissionState: string,
  locationError: string | null,
  isOnline: boolean
) {
  if (!isOnline) return false;

  const readiness = summary?.readiness;
  const detail = readiness?.detail.toLowerCase() ?? '';

  return (
    Boolean(locationError) ||
    permissionState === 'denied' ||
    readiness?.status === 'needs_location' ||
    detail.includes('gps') ||
    detail.includes('location')
  );
}

const READINESS_BADGE_CLASSES: Record<DriverOperationsSummary['readiness']['priority'], string> = {
  success: 'bg-successSoft text-success',
  warning: 'bg-warningSoft text-warning',
  danger: 'bg-dangerSoft text-danger',
  idle: 'bg-surfaceMuted text-textMuted',
};

export default function DriverDashboard({ driver, activeDeliveries }: DriverDashboardProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(true);
  const [readinessSummary, setReadinessSummary] = useState<DriverOperationsSummary | null>(null);
  const [shiftSummary, setShiftSummary] = useState<DriverShiftOperationsSummary | null>(null);
  const dashboardRequestIdRef = useRef(0);

  const currentDelivery = activeDeliveries[0];
  const locationTracker = useLocationTracker({
    driverId: driver?.id ?? null,
    isOnline,
    deliveryId: currentDelivery?.id ?? null,
  });

  const applyReadinessSummary = useCallback(
    (
      summary: DriverOperationsSummary,
      expectedPresenceStatus?: DriverOperationsSummary['presenceStatus']
    ) => {
      const presenceStatus = expectedPresenceStatus ?? summary.presenceStatus;
      const nextSummary = expectedPresenceStatus
        ? {
            ...summary,
            presenceStatus,
          }
        : summary;

      setReadinessSummary(nextSummary);
      setIsOnline(presenceStatus === 'online' || presenceStatus === 'busy');
    },
    []
  );

  const applyShiftSummary = useCallback((summary: DriverShiftOperationsSummary) => {
    setShiftSummary(summary);
    setIsOnline(summary.presenceStatus === 'online' || summary.presenceStatus === 'busy');
    setReadinessSummary((current) =>
      current
        ? {
            ...current,
            presenceStatus: summary.presenceStatus,
            activeDeliveryCount: summary.activeDeliveryCount,
            lastLocationAt: summary.lastLocationAt ?? current.lastLocationAt,
          }
        : current
    );
  }, []);

  const refreshReadiness = useCallback(async (
    expectedPresenceStatus?: DriverOperationsSummary['presenceStatus']
  ) => {
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;

    const readinessResponse = await fetch('/api/driver/readiness');
    if (requestId !== dashboardRequestIdRef.current) return;
    if (!readinessResponse.ok) return;

    const readinessJson = await readinessResponse.json();
    if (requestId !== dashboardRequestIdRef.current) return;

    const summary = parseReadinessSummary(readinessJson);
    if (!summary) return;

    applyReadinessSummary(summary, expectedPresenceStatus);
  }, [applyReadinessSummary]);

  const toggleShiftStatus = async () => {
    const isOnShift = Boolean(shiftSummary?.isOnShift);
    const activeDeliveryCount = readinessSummary?.activeDeliveryCount ?? shiftSummary?.activeDeliveryCount ?? activeDeliveries.length;

    if (isOnShift && activeDeliveryCount > 0) {
      setStatusError('Complete active deliveries before ending your shift.');
      return;
    }

    setIsTogglingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch('/api/driver/shift', {
        method: isOnShift ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || json.error || 'Failed to update shift');
      }

      const summary = parseShiftSummary(json);
      if (!summary) {
        throw new Error('Shift response was incomplete');
      }

      applyShiftSummary(summary);
      setPresenceLoading(false);
      void refreshReadiness(summary.presenceStatus);
    } catch (error) {
      console.error('Error updating shift:', error instanceof Error ? error.message : 'unknown');
      setStatusError('Unable to update your shift right now. Please try again.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const [todayStats, setTodayStats] = useState<{ deliveries: number; earnings: number; hours: number | null }>({
    deliveries: 0,
    earnings: 0,
    hours: null,
  });

  useEffect(() => {
    async function hydrateDashboard() {
      const requestId = dashboardRequestIdRef.current + 1;
      dashboardRequestIdRef.current = requestId;

      try {
        const [presenceResponse, earningsResponse, readinessResponse, shiftResponse] = await Promise.all([
          fetch('/api/driver/presence'),
          fetch('/api/earnings'),
          fetch('/api/driver/readiness'),
          fetch('/api/driver/shift'),
        ]);

        if (requestId !== dashboardRequestIdRef.current) return;

        if (presenceResponse.ok) {
          const presenceJson = await presenceResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const status = presenceJson.data?.presence?.status;
          setIsOnline(status === 'online' || status === 'busy');
        }

        if (earningsResponse.ok) {
          const json = await earningsResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const payload = json.success === true && json.data != null ? json.data : json;
          setTodayStats({
            deliveries: payload.today?.count ?? 0,
            earnings: payload.today?.earnings ?? 0,
            hours: null,
          });
        }

        if (readinessResponse.ok) {
          const readinessJson = await readinessResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const summary = parseReadinessSummary(readinessJson);
          if (summary) {
            applyReadinessSummary(summary);
          }
        }

        if (shiftResponse.ok) {
          const shiftJson = await shiftResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const summary = parseShiftSummary(shiftJson);
          if (summary) {
            applyShiftSummary(summary);
          }
        }
      } catch {
        // Keep defaults on error
      } finally {
        if (requestId === dashboardRequestIdRef.current) {
          setPresenceLoading(false);
        }
      }
    }
    hydrateDashboard();
  }, [applyReadinessSummary, applyShiftSummary]);

  const readiness = readinessSummary?.readiness;
  const readinessPriority = readiness?.priority ?? 'idle';
  const isOnShift = Boolean(shiftSummary?.isOnShift);
  const approvalLabel = formatStatusLabel(readinessSummary?.approvalStatus ?? driver.status);
  const onlineStateLabel = formatStatusLabel(
    readinessSummary?.presenceStatus ?? (isOnline ? 'online' : 'offline')
  );
  const activeDeliveryCount = readinessSummary?.activeDeliveryCount ?? activeDeliveries.length;
  const gpsFreshness = locationTracker.isPosting
    ? 'Posting GPS update...'
    : formatGpsFreshness(
        readinessSummary?.lastLocationAt,
        locationTracker.lastPostedAt,
        Boolean(locationTracker.lastLocation)
      );
  const showRetryLocation = shouldShowRetryLocation(
    readinessSummary,
    locationTracker.permissionState,
    locationTracker.locationError,
    isOnline
  );
  const showShiftEndBlock = isOnShift && activeDeliveryCount > 0;
  const dispatchText =
    readiness?.status === 'ready'
      ? 'Dispatch ready'
      : readiness?.detail ?? 'Checking driver requirements...';
  const readinessTitle =
    readiness?.status === 'ready' ? 'Dispatch ready' : readiness?.label ?? 'Checking readiness';
  const shiftActionLabel = isTogglingStatus
    ? isOnShift ? 'Ending...' : 'Starting...'
    : isOnShift ? 'End shift' : 'Start shift';
  const shiftStatusLabel = presenceLoading ? 'Loading...' : isOnShift ? 'On shift' : 'Off shift';

  return (
    <div className="space-y-4">
      <OfferAlert driverId={driver.id} isOnline={isOnline} />

      {statusError && (
        <div>
          <div className="rounded-xl border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {statusError}
          </div>
        </div>
      )}

      {/* Ready-to-work panel */}
      <div>
        <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm" aria-label="Ready to work">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-textMuted">Ready to work</p>
              <h2 className="mt-1 text-xl font-bold text-text">{readinessTitle}</h2>
              <p className="mt-2 text-sm text-textMuted">{dispatchText}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                READINESS_BADGE_CLASSES[readinessPriority]
              }`}
            >
              {readiness?.blocksDispatch ? 'Blocked' : readiness?.status === 'ready' ? 'Ready' : 'Check'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">Approval</p>
              <p className="mt-1 text-sm font-semibold text-text">{approvalLabel}</p>
            </div>
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">Shift state</p>
              <p className="mt-1 text-sm font-semibold text-text">
                {isOnShift ? 'On shift' : 'Off shift'}
              </p>
              <p className="mt-0.5 text-[11px] text-textSubtle">
                Presence {onlineStateLabel}
              </p>
            </div>
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">GPS freshness</p>
              <p className="mt-1 text-sm font-semibold text-text">{gpsFreshness}</p>
            </div>
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">Active work</p>
              <p className="mt-1 text-sm font-semibold text-text">
                {activeDeliveryCount === 0
                  ? 'None active'
                  : `${activeDeliveryCount} active delivery${activeDeliveryCount === 1 ? '' : 'ies'}`}
              </p>
            </div>
          </div>

          {locationTracker.locationError && (
            <p className="mt-3 text-sm font-medium text-danger">{locationTracker.locationError}</p>
          )}

          {showShiftEndBlock && (
            <p className="mt-3 rounded-xl border border-warning/30 bg-warningSoft px-3 py-2 text-sm font-medium text-warning">
              Complete active deliveries before ending your shift.
            </p>
          )}

          {showRetryLocation && (
            <button
              type="button"
              onClick={locationTracker.startTracking}
              disabled={locationTracker.isPosting}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-60"
            >
              {locationTracker.isPosting ? 'Retrying location...' : 'Retry location'}
            </button>
          )}
        </section>
      </div>

      {/* Shift Toggle */}
      <div
        className={`px-5 py-5 transition-colors duration-300 ${
          isOnShift
            ? 'bg-gradient-to-r from-success to-success'
            : 'bg-gradient-to-r from-surfaceMuted to-borderStrong'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm font-medium opacity-80">Driver Shift</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isOnShift ? 'bg-white animate-pulse' : 'bg-white/50'
                }`}
              />
              <p className="text-2xl font-bold tracking-tight">
                {shiftStatusLabel}
              </p>
            </div>
          </div>
          <button
            data-testid="driver-online-toggle"
            onClick={toggleShiftStatus}
            disabled={isTogglingStatus || showShiftEndBlock}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
              isOnShift
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white text-text hover:bg-surfaceMuted'
            }`}
          >
            {shiftActionLabel}
          </button>
        </div>
      </div>

      {/* Today's Summary */}
      <div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-divider">
          <h2 className="text-base font-bold text-text">Today&apos;s Summary</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{todayStats.deliveries}</p>
              <p className="mt-1 text-xs font-medium text-textMuted">Deliveries</p>
            </div>
            <div className="text-center border-x border-divider">
              <p className="text-3xl font-bold text-success">
                ${todayStats.earnings.toFixed(2)}
              </p>
              <p className="mt-1 text-xs font-medium text-textMuted">Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-text">
                {todayStats.hours === null ? '—' : todayStats.hours.toFixed(1)}
              </p>
              <p className="mt-1 text-xs font-medium text-textMuted">Hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Delivery Card */}
      {currentDelivery && (isOnShift || isOnline) && (
        <div>
          <div className="rounded-2xl border-2 border-primary bg-white p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-text">Active Delivery</h2>
              <span className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-semibold text-primary">
                {formatDeliveryStatus(currentDelivery.status)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-success" />
                <div>
                  <p className="text-sm font-semibold text-text">Pickup</p>
                  <p className="text-sm text-textMuted">{currentDelivery.pickup_address}</p>
                </div>
              </div>
              <div className="ml-1.5 h-6 w-px bg-surfaceMuted ml-[5px]" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-danger" />
                <div>
                  <p className="text-sm font-semibold text-text">Dropoff</p>
                  <p className="text-sm text-textMuted">{currentDelivery.dropoff_address}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-surfaceMuted p-3">
              <div>
                <p className="text-xs text-textMuted">Distance</p>
                <p className="text-sm font-bold text-text">
                  {currentDelivery.distance_km?.toFixed(1) ?? '—'} km
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-textMuted">Earnings</p>
                <p className="text-xl font-bold text-success">
                  ${Number(currentDelivery.driver_payout).toFixed(2)}
                </p>
              </div>
            </div>

            <Link href={`/delivery/${currentDelivery.id}`} className="mt-4 block">
              <button className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primaryHover">
                Open Delivery Workflow
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* No active deliveries empty state */}
      {!currentDelivery && activeDeliveries.length === 0 && (
        <div>
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-divider text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#fff0e8]">
              <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1.5.5M13 16H3m10 0h3m3-3V9.5a1 1 0 00-.293-.707L16 6H13v10h6z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text">No active deliveries</h3>
            <p className="mt-2 text-sm text-textMuted">
              Go online when you are ready to receive offers. Keep this app open while you wait.
            </p>
          </div>
        </div>
      )}

      {/* Waiting state */}
      {isOnShift && !currentDelivery && (
        <div>
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-divider text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-successSoft">
              <svg className="h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text">You&apos;re On Shift!</h3>
            <p className="mt-2 text-sm text-textMuted">
              You are in the offer queue. Keep this app open; new offers will appear here with a countdown.
            </p>
          </div>
        </div>
      )}

      {/* Offline state */}
      {!isOnShift && (
        <div>
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-divider text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surfaceMuted">
              <svg className="h-10 w-10 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text">You&apos;re Off Shift</h3>
            <p className="mt-2 text-sm text-textMuted">
              Go online when you are ready to receive offers. Keep this app open while you wait.
            </p>
            <button
              data-testid="driver-online-toggle"
              onClick={toggleShiftStatus}
              disabled={isTogglingStatus}
              className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
            >
              {shiftActionLabel}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/earnings">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-divider hover:border-primary/30 transition-colors">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-successSoft">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text">My Earnings</p>
              <p className="text-xs text-textMuted">View payout history</p>
            </div>
          </Link>
          <Link href="/history">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-divider hover:border-primary/30 transition-colors">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-infoSoft">
                <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text">Delivery History</p>
              <p className="text-xs text-textMuted">Past deliveries</p>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
