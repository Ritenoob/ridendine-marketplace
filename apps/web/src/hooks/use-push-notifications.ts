'use client';

import { useState, useCallback, useEffect } from 'react';

export type PushPermission = 'default' | 'granted' | 'denied';

export interface PushNotificationsState {
  isSupported: boolean;
  permission: PushPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function checkSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    await navigator.serviceWorker.register('/sw.js');
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function createSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const options: PushSubscriptionOptionsInit = { userVisibleOnly: true };

  if (vapidKey) {
    options.applicationServerKey = urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer;
  }

  try {
    return await registration.pushManager.subscribe(options);
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

async function removeSubscription(subscription: PushSubscription): Promise<void> {
  await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

export function usePushNotifications(): PushNotificationsState {
  const isSupported = checkSupport();

  const [permission, setPermission] = useState<PushPermission>(() => {
    if (!isSupported) return 'default';
    return Notification.permission as PushPermission;
  });

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as PushPermission);
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    const granted = await Notification.requestPermission();
    setPermission(granted as PushPermission);

    if (granted !== 'granted') return;

    const registration = await getSwRegistration();
    if (!registration) return;

    const subscription = await createSubscription(registration);
    if (!subscription) return;

    await saveSubscription(subscription);
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    const registration = await getSwRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await removeSubscription(subscription);
  }, [isSupported]);

  return { isSupported, permission, subscribe, unsubscribe };
}
