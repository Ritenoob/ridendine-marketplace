'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, type LiveIndicatorStatus } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';
import { formatCurrency } from '@ridendine/utils';

interface DeliveryOffer {
  id: string;
  deliveryId: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  routeSeconds: number | null;
  estimatedPayout: number;
  customerTip: number | null;
  orderNumber: string | null;
  storefrontName: string | null;
  expiresAt: string;
}

interface OfferAlertProps {
  driverId: string;
  isOnline: boolean;
  onChannelStatus?: (status: LiveIndicatorStatus) => void;
}

type DeclineReason = 'too_far' | 'unsafe' | 'busy' | 'other';

const DECLINE_REASONS: Array<{ value: DeclineReason; label: string }> = [
  { value: 'too_far', label: 'Too far' },
  { value: 'unsafe', label: 'Unsafe' },
  { value: 'busy', label: 'Busy' },
  { value: 'other', label: 'Other' },
];

function offerErrorMessage(code?: string, fallback?: string) {
  switch (code) {
    case 'OFFER_EXPIRED':
    case 'EXPIRED':
      return 'This offer has expired.';
    case 'OFFER_ALREADY_ACCEPTED':
    case 'ALREADY_ACCEPTED':
    case 'ALREADY_RESPONDED':
      return 'Another driver already accepted this offer.';
    case 'FORBIDDEN':
      return 'You are not eligible to accept this offer.';
    default:
      return fallback || 'Unable to respond to this offer.';
  }
}

function mapBroadcastToOffer(payload: Record<string, unknown>): DeliveryOffer | null {
  const attemptId = typeof payload.attemptId === 'string' ? payload.attemptId : null;
  const deliveryId = typeof payload.deliveryId === 'string' ? payload.deliveryId : null;
  const expiresAt = typeof payload.expiresAt === 'string' ? payload.expiresAt : null;
  if (!attemptId || !deliveryId || !expiresAt) return null;
  const pickupAddress = typeof payload.pickupAddress === 'string' ? payload.pickupAddress : '';
  const dropoffAddress = typeof payload.dropoffAddress === 'string' ? payload.dropoffAddress : '';
  const distanceKm =
    typeof payload.estimatedDistanceKm === 'number' && Number.isFinite(payload.estimatedDistanceKm)
      ? payload.estimatedDistanceKm
      : 0;
  const estimatedPayout =
    typeof payload.estimatedPayout === 'number' && Number.isFinite(payload.estimatedPayout)
      ? payload.estimatedPayout
      : 0;
  const routeSeconds =
    typeof payload.estimatedRouteSeconds === 'number' && Number.isFinite(payload.estimatedRouteSeconds)
      ? payload.estimatedRouteSeconds
      : typeof payload.estimatedMinutes === 'number' && Number.isFinite(payload.estimatedMinutes)
        ? payload.estimatedMinutes * 60
        : null;
  const customerTip =
    typeof payload.customerTip === 'number' && Number.isFinite(payload.customerTip)
      ? payload.customerTip
      : null;
  const orderNumber = typeof payload.orderNumber === 'string' ? payload.orderNumber : null;
  const storefrontName =
    typeof payload.storefrontName === 'string' && payload.storefrontName.trim() !== ''
      ? payload.storefrontName
      : null;
  return {
    id: attemptId,
    deliveryId,
    pickupAddress,
    dropoffAddress,
    distanceKm,
    routeSeconds,
    estimatedPayout,
    customerTip,
    orderNumber,
    storefrontName,
    expiresAt,
  };
}

// Offer payout/tip amounts are dollars (deliveries.driver_payout / orders.tip).
function formatMoney(value: number) {
  return formatCurrency(value);
}

function formatRouteTime(seconds: number | null) {
  if (!seconds || seconds <= 0) return 'Not available';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 350);
  } catch {
    // Audio not available
  }
}

function CountdownBadge({ secondsLeft }: { secondsLeft: number }) {
  const isUrgent = secondsLeft <= 15;
  return (
    <div
      className={`rounded-full px-3 py-1 text-sm font-bold ${
        isUrgent
          ? 'bg-dangerSoft text-danger animate-pulse'
          : 'bg-primarySoft text-primary'
      }`}
    >
      {secondsLeft}s
    </div>
  );
}

function RouteDisplay({
  pickupAddress,
  dropoffAddress,
  storefrontName,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  storefrontName: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-success" />
        <div>
          <p className="text-xs font-medium text-textMuted">Pickup from</p>
          {storefrontName ? (
            <p className="text-sm font-semibold text-text">{storefrontName}</p>
          ) : null}
          <p className="text-sm font-medium text-text">{pickupAddress}</p>
        </div>
      </div>
      <div className="ml-[5px] h-4 w-px bg-surfaceMuted" />
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-danger" />
        <div>
          <p className="text-xs font-medium text-textMuted">Deliver to</p>
          <p className="text-sm font-medium text-text">{dropoffAddress}</p>
        </div>
      </div>
    </div>
  );
}

function OfferStats({
  distanceKm,
  estimatedPayout,
  routeSeconds,
}: {
  distanceKm: number;
  estimatedPayout: number;
  routeSeconds: number | null;
}) {
  const payPerKm = distanceKm > 0 ? estimatedPayout / distanceKm : 0;

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surfaceMuted p-3">
      <div className="text-center">
        <p className="text-lg font-bold text-text">{distanceKm.toFixed(1)} km</p>
        <p className="text-xs text-textMuted">Distance</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-success">{formatMoney(estimatedPayout)}</p>
        <p className="text-xs text-textMuted">Earnings</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-text">{formatMoney(payPerKm)}/km</p>
        <p className="text-xs text-textMuted">Pay per km</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-text">{formatRouteTime(routeSeconds)}</p>
        <p className="text-xs text-textMuted">Route time</p>
      </div>
    </div>
  );
}

export function OfferAlert({ driverId, isOnline, onChannelStatus }: OfferAlertProps) {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [respondingAction, setRespondingAction] = useState<'accept' | 'decline' | null>(null);
  const [declineReason, setDeclineReason] = useState<DeclineReason>('too_far');
  const [responseError, setResponseError] = useState<string | null>(null);
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (!isOnline || !driverId) return;

    const supabase = createBrowserClient();
    if (!supabase) return;

    const channelName = `driver:${driverId}:offers`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        const p = payload as Record<string, unknown>;
        const mapped = mapBroadcastToOffer(p);
        if (!mapped) return;
        setOffer((prev) => {
          if (prev?.id === mapped.id) return prev;
          hasPlayedSound.current = false;
          return mapped;
        });
      })
      .on('broadcast', { event: 'offer_expired' }, ({ payload }) => {
        const p = payload as Record<string, unknown>;
        const id = typeof p.attemptId === 'string' ? p.attemptId : null;
        setOffer((prev) => {
          if (!prev || !id || prev.id !== id) return prev;
          return null;
        });
      })
      .subscribe((status) => {
        onChannelStatus?.(status as unknown as LiveIndicatorStatus);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOnline, driverId, onChannelStatus]);

  useEffect(() => {
    if (!offer) return;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) setOffer(null);
    };

    updateCountdown();

    if (!hasPlayedSound.current) {
      playAlertSound();
      hasPlayedSound.current = true;
    }

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  const respond = async (action: 'accept' | 'decline') => {
    if (!offer) return;
    let shouldDismissOffer = false;
    setRespondingAction(action);
    setResponseError(null);

    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: offer.id,
          driverId,
          action,
          ...(action === 'decline' ? { reason: declineReason } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCode =
          typeof payload?.code === 'string'
            ? payload.code
            : typeof payload?.error?.code === 'string'
              ? payload.error.code
              : undefined;
        const fallback =
          typeof payload?.message === 'string'
            ? payload.message
            : typeof payload?.error?.message === 'string'
              ? payload.error.message
              : undefined;
        setResponseError(offerErrorMessage(errorCode, fallback));
        return;
      }

      if (action === 'accept') {
        window.location.href = `/delivery/${offer.deliveryId}`;
      } else {
        shouldDismissOffer = true;
      }
    } catch (error) {
      console.error('Failed to respond to offer:', error);
      setResponseError('Network error while responding to this offer.');
    } finally {
      if (shouldDismissOffer) {
        setOffer(null);
      }
      setRespondingAction(null);
    }
  };

  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text">New Delivery!</h2>
            {offer.orderNumber ? (
              <p className="text-xs font-medium text-textMuted">Order {offer.orderNumber}</p>
            ) : null}
          </div>
          <CountdownBadge secondsLeft={secondsLeft} />
        </div>

        <RouteDisplay
          pickupAddress={offer.pickupAddress}
          dropoffAddress={offer.dropoffAddress}
          storefrontName={offer.storefrontName}
        />

        <OfferStats
          distanceKm={offer.distanceKm}
          estimatedPayout={offer.estimatedPayout}
          routeSeconds={offer.routeSeconds}
        />

        {offer.customerTip != null && offer.customerTip > 0 ? (
          <p className="mt-3 rounded-lg bg-successSoft px-3 py-2 text-sm font-medium text-success">
            Tip included: {formatMoney(offer.customerTip)}
          </p>
        ) : null}

        {responseError ? (
          <div className="mt-4 rounded-lg border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">
            {responseError}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-medium text-textMuted" htmlFor="decline-reason">
          Decline reason
        </label>
        <select
          id="decline-reason"
          value={declineReason}
          onChange={(event) => setDeclineReason(event.target.value as DeclineReason)}
          disabled={respondingAction !== null}
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
        >
          {DECLINE_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>

        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl py-3"
            onClick={() => respond('decline')}
            disabled={respondingAction !== null}
          >
            {respondingAction === 'decline' ? 'Declining...' : 'Decline'}
          </Button>
          <Button
            variant="success"
            className="flex-1 rounded-xl py-3"
            onClick={() => respond('accept')}
            disabled={respondingAction !== null}
          >
            {respondingAction === 'accept' ? 'Accepting...' : 'Accept'}
          </Button>
        </div>
      </div>
    </div>
  );
}
