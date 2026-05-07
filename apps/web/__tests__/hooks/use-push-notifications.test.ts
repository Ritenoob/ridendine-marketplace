/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';

// Mock global Notification API
const mockRequestPermission = jest.fn();
const mockNotificationConstructor = jest.fn();

Object.defineProperty(global, 'Notification', {
  writable: true,
  value: Object.assign(mockNotificationConstructor, {
    permission: 'default' as NotificationPermission,
    requestPermission: mockRequestPermission,
  }),
});

// Mock ServiceWorker API
const mockSubscribe = jest.fn();
const mockGetRegistration = jest.fn();
const mockRegister = jest.fn();

Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: mockRegister,
    getRegistration: mockGetRegistration,
    ready: Promise.resolve({
      pushManager: {
        subscribe: mockSubscribe,
        getSubscription: jest.fn().mockResolvedValue(null),
      },
    }),
  },
});

// Mock fetch
global.fetch = jest.fn();

import { usePushNotifications } from '../../src/hooks/use-push-notifications';

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Notification.permission
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'default',
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  it('returns isSupported true when Notification and serviceWorker are available', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });

  it('returns initial permission state from Notification.permission', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('default');
  });

  it('returns granted when Notification.permission is already granted', () => {
    Object.defineProperty(Notification, 'permission', { writable: true, value: 'granted' });
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('granted');
  });

  it('returns denied when Notification.permission is denied', () => {
    Object.defineProperty(Notification, 'permission', { writable: true, value: 'denied' });
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('denied');
  });

  it('subscribe requests permission and subscribes when granted', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/test',
      toJSON: () => ({
        endpoint: 'https://fcm.googleapis.com/test',
        keys: { p256dh: 'key1', auth: 'auth1' },
      }),
    };
    mockSubscribe.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result.current.permission).toBe('granted');
  });

  it('subscribe does not throw when permission is denied', async () => {
    mockRequestPermission.mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.permission).toBe('denied');
  });

  it('unsubscribe is a function', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(typeof result.current.unsubscribe).toBe('function');
  });

  it('unsubscribe exits cleanly when no subscription exists', async () => {
    const { result } = renderHook(() => usePushNotifications());

    // unsubscribe when nothing is subscribed should not throw
    await act(async () => {
      await result.current.unsubscribe();
    });

    // permission should remain unchanged
    expect(result.current.permission).toBe('default');
  });

  it('subscribe saves subscription to API after push subscribe succeeds', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    const mockSub = {
      endpoint: 'https://push.example.com/test',
      toJSON: () => ({
        endpoint: 'https://push.example.com/test',
        keys: { p256dh: 'pk', auth: 'ak' },
      }),
    };
    mockSubscribe.mockResolvedValue(mockSub);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/notifications/subscribe',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('subscribe updates permission state to granted', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    mockSubscribe.mockResolvedValue({
      endpoint: 'https://push.example.com/test',
      toJSON: () => ({ endpoint: 'x', keys: { p256dh: 'p', auth: 'a' } }),
    });

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('default');

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.permission).toBe('granted');
  });
});
