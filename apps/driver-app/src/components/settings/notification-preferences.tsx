'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@ridendine/ui';

type NotificationChannel = 'email' | 'sms';
type NotificationEvent =
  | 'new_order'
  | 'order_accepted'
  | 'order_ready'
  | 'delivery_offer'
  | 'delivery_assigned'
  | 'payment_received';

type Preferences = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

const API_PATH = '/api/driver/notification-preferences';

const EVENTS: { key: NotificationEvent; label: string; description: string }[] = [
  { key: 'new_order', label: 'New Order', description: 'When a new order is available nearby' },
  { key: 'order_accepted', label: 'Order Accepted', description: 'When an order is accepted' },
  { key: 'order_ready', label: 'Order Ready', description: 'When your pickup order is ready' },
  { key: 'delivery_offer', label: 'Delivery Offer', description: 'When a delivery offer arrives' },
  { key: 'delivery_assigned', label: 'Delivery Assigned', description: 'When a delivery is assigned to you' },
  { key: 'payment_received', label: 'Payment Received', description: 'When you receive a payment' },
];

function buildDefaultPrefs(): Preferences {
  const defaults = {} as Preferences;
  for (const ev of EVENTS) {
    defaults[ev.key] = { email: true, sms: true };
  }
  return defaults;
}

function mergePrefs(value: unknown): Preferences {
  const defaults = buildDefaultPrefs();
  if (!value || typeof value !== 'object') return defaults;

  const candidate = value as Partial<Preferences>;
  for (const ev of EVENTS) {
    const row = candidate[ev.key];
    if (row && typeof row.email === 'boolean' && typeof row.sms === 'boolean') {
      defaults[ev.key] = { email: row.email, sms: row.sms };
    }
  }

  return defaults;
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(buildDefaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPrefs() {
      try {
        const response = await fetch(API_PATH);
        const json = await response.json();
        if (!active) return;

        if (response.ok && json?.success) {
          setPrefs(mergePrefs(json.data?.preferences));
          setMessage(null);
        } else {
          setMessage('Could not load preferences. Defaults are shown.');
        }
      } catch {
        if (active) setMessage('Could not load preferences. Defaults are shown.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPrefs();
    return () => {
      active = false;
    };
  }, []);

  const toggle = (event: NotificationEvent, channel: NotificationChannel) => {
    setPrefs((prev) => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event][channel] },
    }));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(API_PATH, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      const json = await response.json();

      if (!response.ok || !json?.success) {
        setMessage('Could not save preferences.');
        return;
      }

      setPrefs(mergePrefs(json.data?.preferences));
      setMessage('Saved!');
      setTimeout(() => setMessage((current) => (current === 'Saved!' ? null : current)), 2500);
    } catch {
      setMessage('Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Notification Preferences</h2>
      <p className="mt-1 text-[13px] text-[#6b7280]">
        Choose how you want to be notified. Synced with your driver account.
      </p>

      <Card className="mt-3 border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider">
                <th className="pb-3 text-left text-[13px] font-medium text-[#6b7280]">Event</th>
                <th className="pb-3 text-center text-[13px] font-medium text-[#6b7280]">Email</th>
                <th className="pb-3 text-center text-[13px] font-medium text-[#6b7280]">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {EVENTS.map(({ key, label, description }) => (
                <tr key={key}>
                  <td className="py-3 pr-4">
                    <p className="text-[14px] font-medium text-[#1a1a1a]">{label}</p>
                    <p className="text-[12px] text-[#9ca3af]">{description}</p>
                  </td>
                  {(['email', 'sms'] as NotificationChannel[]).map((ch) => (
                    <td key={ch} className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(key, ch)}
                        aria-label={`${label} ${ch.toUpperCase()}`}
                        className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:shadow-focus ${
                          prefs[key][ch] ? 'bg-primary' : 'bg-surfaceMuted'
                        }`}
                        aria-checked={prefs[key][ch]}
                        role="switch"
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            prefs[key][ch] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={() => void handleSave()}
            disabled={loading || saving}
            className="rounded-lg bg-primary hover:bg-primaryHover"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          {loading && <span className="text-[13px] text-[#6b7280]">Loading preferences...</span>}
          {message && (
            <span className={`text-[13px] ${message === 'Saved!' ? 'text-success' : 'text-warning'}`}>
              {message}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
