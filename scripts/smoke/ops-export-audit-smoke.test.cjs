const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildExportUrl,
  findExportAuditEntry,
  isCsvResponse,
  parseArgs,
} = require('./ops-export-audit-smoke.cjs');

test('buildExportUrl creates a bounded orders export URL', () => {
  const url = buildExportUrl('https://ops.ridendine.ca', {
    type: 'orders',
    start: '2026-06-01T00:00:00.000Z',
    end: '2026-06-02T00:00:00.000Z',
  });

  assert.equal(
    url,
    'https://ops.ridendine.ca/api/export?type=orders&start=2026-06-01T00%3A00%3A00.000Z&end=2026-06-02T00%3A00%3A00.000Z'
  );
});

test('isCsvResponse requires text/csv and a header row', () => {
  assert.equal(isCsvResponse({ contentType: 'text/csv', body: 'Order Number,Status\nR-1,paid' }), true);
  assert.equal(isCsvResponse({ contentType: 'application/json', body: '{"ok":true}' }), false);
  assert.equal(isCsvResponse({ contentType: 'text/csv', body: '' }), false);
});

test('findExportAuditEntry locates an export audit row by action and entity type', () => {
  const item = findExportAuditEntry([
    { id: '1', action: 'status_change', entity_type: 'order' },
    { id: '2', action: 'export', entity_type: 'export', created_at: '2026-06-07T19:00:00.000Z' },
  ]);

  assert.equal(item.id, '2');
});

test('findExportAuditEntry can exclude rows seen before export', () => {
  const item = findExportAuditEntry(
    [
      { id: 'old', action: 'export', entity_type: 'export', created_at: '2026-06-07T19:00:00.000Z' },
      { id: 'new', action: 'export', entity_type: 'export', created_at: '2026-06-07T19:01:00.000Z' },
    ],
    { excludeIds: new Set(['old']) }
  );

  assert.equal(item.id, 'new');
});

test('parseArgs defaults to a live-safe operational export type', () => {
  const args = parseArgs([]);

  assert.equal(args.type, 'orders');
  assert.equal(args.requireAuth, false);
  assert.equal(args.writeDocs, false);
});
