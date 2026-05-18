/**
 * @jest-environment node
 */
import { POST } from '../route';
import { headers } from 'next/headers';
import { getStripeClient } from '@ridendine/engine';
import {
  createLoyaltyService,
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookSuccess,
} from '@ridendine/engine';
import { getEngine, getSystemActor } from '@/lib/engine';
import { clearCart, createAdminClient } from '@ridendine/db';

const mockEvaluateRateLimit = jest.fn();

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { webhookStripe: { name: 'webhook_stripe' } },
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  rateLimitPolicyResponse: () =>
    Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
  redactSensitiveForLog: (value: string) => value,
  getCorrelationId: () => 'test-correlation-id',
  withCorrelationId: (response: Response) => response,
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: jest.fn(),
  createLoyaltyService: jest.fn(),
  claimStripeWebhookEventForProcessing: jest.fn(),
  finalizeStripeWebhookSuccess: jest.fn(),
  finalizeStripeWebhookFailure: jest.fn(),
  handleStripeFinanceWebhook: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(),
  clearCart: jest.fn(),
}));

jest.mock('@/lib/engine', () => ({
  getEngine: jest.fn(),
  getSystemActor: jest.fn(),
}));

function createAdminClientMock(orderPatchSink: Record<string, unknown>[] = []) {
  return {
    from(table: string) {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'order-1',
                  customer_id: 'cust-1',
                  subtotal: 12,
                  total: 12,
                  payment_status: 'pending',
                  engine_status: 'draft',
                },
                error: null,
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              orderPatchSink.push(patch);
              return { data: null, error: null };
            },
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
        upsert: async () => ({ data: null, error: null }),
      };
    },
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
  };
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 100,
      policy: 'webhook_stripe',
    });
    jest.mocked(getEngine).mockReturnValue({
      orderCreation: {
        authorizePayment: jest.fn().mockResolvedValue({ success: true }),
        submitToKitchen: jest.fn().mockResolvedValue({ success: true }),
      },
      orders: {},
      platform: {
        handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
      audit: { log: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ReturnType<typeof getEngine>);
    jest
      .mocked(claimStripeWebhookEventForProcessing)
      .mockResolvedValue({ action: 'proceed', rowId: 'row-1' });
    jest.mocked(finalizeStripeWebhookSuccess).mockResolvedValue(undefined);
    jest.mocked(getSystemActor).mockReturnValue({
      userId: 'system',
      role: 'system',
    } as ReturnType<typeof getSystemActor>);
    jest.mocked(clearCart).mockResolvedValue(undefined);
    jest.mocked(createLoyaltyService).mockReturnValue({
      earnPoints: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof createLoyaltyService>);
    jest.mocked(createAdminClient).mockReturnValue(createAdminClientMock() as ReturnType<typeof createAdminClient>);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: () => null,
    } as Awaited<ReturnType<typeof headers>>);

    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      error: 'Missing signature',
    });
    expect(getStripeClient).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: (name: string) =>
        name === 'stripe-signature' ? 't=0,v1=invalid' : null,
    } as Awaited<ReturnType<typeof headers>>);

    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{"id":"evt_test"}',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      error: 'Invalid signature',
    });
  });

  it('returns idempotent replay when event already processed', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_1',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: { object: { metadata: { order_id: 'order-1' } } },
        }),
      },
    } as ReturnType<typeof getStripeClient>);
    jest
      .mocked(claimStripeWebhookEventForProcessing)
      .mockResolvedValue({ action: 'skip_already_processed' });

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      idempotentReplay: true,
      reason: 'skip_already_processed',
    });
    expect(finalizeStripeWebhookSuccess).not.toHaveBeenCalled();
  });

  it('handles payment success exactly once', async () => {
    const authorizePayment = jest.fn().mockResolvedValue({ success: true });
    const submitToKitchen = jest.fn().mockResolvedValue({ success: true });
    const events = { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    jest.mocked(getEngine).mockReturnValue({
      orderCreation: { authorizePayment, submitToKitchen },
      orders: {},
      platform: {
        handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events,
      audit,
    } as unknown as ReturnType<typeof getEngine>);
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_2',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: {
            object: {
              id: 'pi_123',
              amount: 1200,
              metadata: { order_id: 'order-1', order_number: 'RD-1' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    expect(authorizePayment).toHaveBeenCalledWith(
      'order-1',
      'pi_123',
      expect.objectContaining({ role: 'system' })
    );
    expect(authorizePayment.mock.invocationCallOrder[0]).toBeLessThan(
      submitToKitchen.mock.invocationCallOrder[0]
    );
    expect(submitToKitchen).toHaveBeenCalledTimes(1);
    expect(finalizeStripeWebhookSuccess).toHaveBeenCalledTimes(1);
  });

  it('handles payment failure without confirming order', async () => {
    const submitToKitchen = jest.fn().mockResolvedValue({ success: true });
    const handlePaymentFailure = jest.fn().mockResolvedValue({ success: true });
    jest.mocked(getEngine).mockReturnValue({
      orderCreation: {
        authorizePayment: jest.fn().mockResolvedValue({ success: true }),
        submitToKitchen,
      },
      orders: {},
      platform: {
        handlePaymentFailure,
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
      audit: { log: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ReturnType<typeof getEngine>);
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_3',
          type: 'payment_intent.payment_failed',
          livemode: false,
          data: {
            object: {
              id: 'pi_999',
              metadata: { order_id: 'order-2', order_number: 'RD-2' },
              last_payment_error: { message: 'card declined' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    expect(handlePaymentFailure).toHaveBeenCalledTimes(1);
    expect(submitToKitchen).not.toHaveBeenCalled();
  });

  it('safely ignores unknown event types', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_4',
          type: 'customer.created',
          livemode: false,
          data: { object: {} },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
  });

  it('replay-safety: second call with same event.id short-circuits via claimStripeWebhookEventForProcessing', async () => {
    const submitToKitchen = jest.fn().mockResolvedValue({ success: true });
    jest.mocked(getEngine).mockReturnValue({
      orderCreation: {
        authorizePayment: jest.fn().mockResolvedValue({ success: true }),
        submitToKitchen,
      },
      orders: {},
      platform: {
        handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
      audit: { log: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ReturnType<typeof getEngine>);

    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);

    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_replay_5',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: {
            object: {
              id: 'pi_replay',
              amount: 1200,
              metadata: { order_id: 'order-replay', order_number: 'RD-5' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    // First call: proceed normally
    jest.mocked(claimStripeWebhookEventForProcessing).mockResolvedValueOnce({
      action: 'proceed',
      rowId: 'row-replay',
    });
    const first = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(first.status).toBe(200);
    expect(submitToKitchen).toHaveBeenCalledTimes(1);

    // Reset submit count between calls
    submitToKitchen.mockClear();
    jest.mocked(finalizeStripeWebhookSuccess).mockClear();

    // Second call: already processed — short-circuit
    jest.mocked(claimStripeWebhookEventForProcessing).mockResolvedValueOnce({
      action: 'skip_already_processed',
    });
    const second = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody).toMatchObject({ received: true, idempotentReplay: true });
    // Ledger insert (via submitToKitchen) must NOT be called the second time
    expect(submitToKitchen).not.toHaveBeenCalled();
    expect(finalizeStripeWebhookSuccess).not.toHaveBeenCalled();
  });

  it('replay-safety: first-time event proceeds — submitToKitchen and finalizeStripeWebhookSuccess are called', async () => {
    const submitToKitchen = jest.fn().mockResolvedValue({ success: true });
    jest.mocked(getEngine).mockReturnValue({
      orderCreation: {
        authorizePayment: jest.fn().mockResolvedValue({ success: true }),
        submitToKitchen,
      },
      orders: {},
      platform: {
        handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
      audit: { log: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ReturnType<typeof getEngine>);

    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);

    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_firsttime_6',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: {
            object: {
              id: 'pi_firsttime',
              amount: 1200,
              metadata: { order_id: 'order-firsttime', order_number: 'RD-6' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    jest.mocked(claimStripeWebhookEventForProcessing).mockResolvedValueOnce({
      action: 'proceed',
      rowId: 'row-firsttime',
    });

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    // First-time event: submitToKitchen and finalize ARE called
    expect(submitToKitchen).toHaveBeenCalledTimes(1);
    expect(finalizeStripeWebhookSuccess).toHaveBeenCalledTimes(1);
  });
});
