import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  createAdminClient,
  listBankPayoutExportRows,
  listChefExportRows,
  listCustomerExportRows,
  listDriverExportRows,
  listLedgerExportRows,
  listOrderExportRows,
  listStripeEventExportRows,
  type SupabaseClient,
} from '@ridendine/db';
import { AuditAction } from '@ridendine/types';
import { getEngine, getOpsActorContext, guardPlatformApi, finalizeOpsActor } from '@/lib/engine';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function buildCsvRow(row: any): string {
  const values = Object.values(row).map((v: any) => {
    let str = v == null ? '' : String(v);
    // Neutralize spreadsheet formula injection: Excel/Sheets execute cells
    // starting with = + - @ or tab/CR, and customer-supplied text lands here.
    // Plain numbers (e.g. negative ledger amounts) are exempt — they are data,
    // not formulas, and the apostrophe would corrupt them.
    if (/^[=+\-@\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) {
      str = `'${str}`;
    }
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  });
  return values.join(',');
}

async function fetchOrders(client: SupabaseClient, startDate: string, endDate: string) {
  const data = await listOrderExportRows(client, startDate, endDate);
  return {
    rows: data || [],
    headers: ['Order Number', 'Status', 'Subtotal', 'Delivery Fee', 'Service Fee', 'Tax', 'Tip', 'Total', 'Payment', 'Date'],
  };
}

async function fetchLedger(client: SupabaseClient, startDate: string, endDate: string) {
  const data = await listLedgerExportRows(client, startDate, endDate);
  return {
    rows: (data || []).map((r: any) => ({ ...r, amount: (r.amount_cents / 100).toFixed(2) })),
    headers: ['Type', 'Amount', 'Currency', 'Description', 'Entity Type', 'Entity ID', 'Date'],
  };
}

async function fetchStripeEventsProcessed(client: SupabaseClient, startDate: string, endDate: string) {
  const data = await listStripeEventExportRows(client, startDate, endDate);
  return {
    rows: data || [],
    headers: [
      'Stripe Event ID',
      'Event Type',
      'Livemode',
      'Status',
      'Related Order ID',
      'Processed At',
      'Error',
      'Created At',
    ],
  };
}

async function fetchBankPayouts(client: SupabaseClient, startDate: string, endDate: string) {
  const data = await listBankPayoutExportRows(client, startDate, endDate);
  return {
    rows: (data || []).map((r: any) => ({
      payout_id: r.id,
      payee_type: 'chef',
      payee_id: r.chef_id,
      amount: (r.amount / 100).toFixed(2),
      status: r.status,
      bank_batch_id: r.bank_batch_id,
      bank_reference: r.bank_reference,
      reconciliation_status: r.reconciliation_status,
      period_start: r.period_start,
      period_end: r.period_end,
      created_at: r.created_at,
    })),
    headers: [
      'Payout ID',
      'Payee Type',
      'Payee ID',
      'Amount',
      'Status',
      'BANK Batch ID',
      'BANK Reference',
      'Reconciliation Status',
      'Period Start',
      'Period End',
      'Created At',
    ],
  };
}

async function fetchCustomers(client: SupabaseClient) {
  const data = await listCustomerExportRows(client);
  return {
    rows: data || [],
    headers: ['First Name', 'Last Name', 'Email', 'Phone', 'Joined'],
  };
}

async function fetchChefs(client: SupabaseClient) {
  const data = await listChefExportRows(client);
  return {
    rows: data || [],
    headers: ['Name', 'Phone', 'Status', 'Joined'],
  };
}

async function fetchDrivers(client: SupabaseClient) {
  const data = await listDriverExportRows(client);
  return {
    rows: data || [],
    headers: ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Deliveries', 'Rating', 'Joined'],
  };
}

export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const startDate = searchParams.get('start') || new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const endDate = searchParams.get('end') || new Date().toISOString();

  const financeExportTypes = new Set(['ledger', 'stripe_events', 'bank_payouts']);
  const capability = financeExportTypes.has(type || '')
    ? 'finance_export_ledger'
    : 'ops_export_operational';
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, capability));
  if (opsActor instanceof Response) return opsActor;

  const client = createAdminClient() as unknown as SupabaseClient;
  let rows: any[] = [];
  let headers: string[] = [];

  switch (type) {
    case 'orders': {
      ({ rows, headers } = await fetchOrders(client, startDate, endDate));
      break;
    }
    case 'ledger': {
      ({ rows, headers } = await fetchLedger(client, startDate, endDate));
      break;
    }
    case 'stripe_events': {
      ({ rows, headers } = await fetchStripeEventsProcessed(client, startDate, endDate));
      break;
    }
    case 'bank_payouts': {
      ({ rows, headers } = await fetchBankPayouts(client, startDate, endDate));
      break;
    }
    case 'customers': {
      ({ rows, headers } = await fetchCustomers(client));
      break;
    }
    case 'chefs': {
      ({ rows, headers } = await fetchChefs(client));
      break;
    }
    case 'drivers': {
      ({ rows, headers } = await fetchDrivers(client));
      break;
    }
    default:
      return NextResponse.json(
        {
          error:
            'Invalid type. Use: orders, ledger, stripe_events, bank_payouts, customers, chefs, drivers',
        },
        { status: 400 }
      );
  }

  const csvRows = [headers.join(','), ...rows.map(buildCsvRow)];

  // C.6 / O4 — record every successful export so PII access is reviewable.
  // Audit-before-release: if the audit trail cannot be written, the export is
  // refused — PII must never leave the platform without a reviewable record.
  // audit.log swallows insert errors and returns null, so gate on the return
  // value (a thrown error is also caught for completeness).
  const engine = getEngine();
  let auditEntry = null;
  try {
    auditEntry = await engine.audit.log({
      action: AuditAction.EXPORT,
      entityType: 'export',
      entityId: randomUUID(),
      actor: opsActor,
      afterState: {
        kind: type,
        rows_count: rows.length,
        columns: headers,
        period_start: startDate,
        period_end: endDate,
        capability,
      },
    });
  } catch (err) {
    console.error('[export] audit log threw - export refused:', err);
  }
  if (!auditEntry) {
    return NextResponse.json(
      { error: 'Export could not be audit-logged and was not released. Try again.' },
      { status: 503 }
    );
  }

  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
