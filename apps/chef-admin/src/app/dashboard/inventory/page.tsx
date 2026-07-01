'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Spinner } from '@ridendine/ui';
import { AlertTriangle, Plus, RefreshCw, PackageX, Clock } from 'lucide-react';
import { InventoryItemModal, type InventoryItem } from '@/components/inventory/inventory-item-modal';
import { StockMovementModal } from '@/components/inventory/stock-movement-modal';

type StockStatus = 'stockout' | 'low' | 'ok';

interface ItemRow extends InventoryItem {
  stockStatus: StockStatus;
}

interface AlertRow {
  inventoryItemId: string;
  alertType: 'low_stock' | 'stockout' | 'expiring_soon' | 'expired';
  name: string | null;
  unit: string | null;
  onHand: number;
  reorderSuggestion: number;
}

const STATUS_BADGE: Record<StockStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  ok: { label: 'In stock', variant: 'success' },
  low: { label: 'Low', variant: 'warning' },
  stockout: { label: 'Out', variant: 'error' },
};

const ALERT_LABEL: Record<AlertRow['alertType'], { label: string; variant: 'warning' | 'error' }> = {
  low_stock: { label: 'Low stock', variant: 'warning' },
  stockout: { label: 'Stockout', variant: 'error' },
  expiring_soon: { label: 'Expiring soon', variant: 'warning' },
  expired: { label: 'Expired', variant: 'error' },
};

function money(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export default function InventoryPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<ItemRow | null>(null);
  const [movementMode, setMovementMode] = useState<'receive' | 'waste' | 'adjust'>('receive');

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, alertsRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory/alerts'),
      ]);
      if (!itemsRes.ok) throw new Error('items');
      const itemsJson = await itemsRes.json();
      setItems(itemsJson.data?.items ?? []);
      if (alertsRes.ok) {
        const alertsJson = await alertsRes.json();
        setAlerts(alertsJson.data?.alerts ?? []);
      }
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    setItemModalOpen(true);
  };
  const openEdit = (item: ItemRow) => {
    setEditing(item);
    setItemModalOpen(true);
  };
  const openMovement = (item: ItemRow, mode: 'receive' | 'waste' | 'adjust') => {
    setMovementItem(item);
    setMovementMode(mode);
  };

  const stockValue = items.reduce((sum, i) => sum + Number(i.current_quantity ?? 0) * Number(i.cost_per_unit ?? 0), 0);
  const lowOrOut = items.filter((i) => i.stockStatus !== 'ok').length;
  const expiringCount = alerts.filter((a) => a.alertType === 'expiring_soon' || a.alertType === 'expired').length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventory</h1>
          <p className="mt-1 text-sm text-textMuted">Track stock, receive deliveries, log waste, and stay ahead of stockouts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            aria-label="Refresh inventory"
            className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted transition-colors hover:text-text"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Button onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add item
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-warningSoft px-4 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Couldn&apos;t refresh — showing the last data loaded.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Items tracked</p><p className="mt-1 text-2xl font-bold text-text">{items.length}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Low / out</p><p className={`mt-1 text-2xl font-bold ${lowOrOut > 0 ? 'text-danger' : 'text-text'}`}>{lowOrOut}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Expiring</p><p className={`mt-1 text-2xl font-bold ${expiringCount > 0 ? 'text-warning' : 'text-text'}`}>{expiringCount}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Stock value</p><p className="mt-1 text-2xl font-bold text-text">{money(stockValue)}</p></Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="font-bold text-text">Attention needed ({alerts.length})</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((a, idx) => {
              const cfg = ALERT_LABEL[a.alertType];
              return (
                <div key={`${a.inventoryItemId}-${a.alertType}-${idx}`} className="flex items-center justify-between rounded-lg bg-surfaceMuted px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <span className="text-sm font-medium text-text">{a.name ?? 'Item'}</span>
                    <span className="text-xs text-textMuted">{a.onHand} {a.unit}</span>
                  </div>
                  {a.reorderSuggestion > 0 && (
                    <span className="text-xs text-textMuted">Order ~{a.reorderSuggestion} {a.unit}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Items table */}
      {items.length === 0 ? (
        <EmptyState
          icon={<PackageX className="h-8 w-8" />}
          title="No inventory yet"
          description="Add your ingredients to track stock, get low-stock alerts, and see food cost per menu item."
          action={<Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Add your first item</Button>}
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs font-semibold uppercase tracking-wide text-textSubtle">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">On hand</th>
                <th className="px-4 py-3 text-right">Par</th>
                <th className="px-4 py-3 text-right">Reorder</th>
                <th className="px-4 py-3 text-right">Cost/unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const badge = STATUS_BADGE[item.stockStatus];
                return (
                  <tr key={item.id} className="border-b border-divider hover:bg-surfaceMuted">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{item.name}</p>
                      <p className="text-xs text-textMuted">
                        {item.category ?? 'Uncategorized'}
                        {item.expiry_date ? <span className="ml-2 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{item.expiry_date}</span> : null}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text tabular-nums">{item.current_quantity} <span className="text-xs font-normal text-textMuted">{item.unit}</span></td>
                    <td className="px-4 py-3 text-right text-textMuted tabular-nums">{item.par_quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-textMuted tabular-nums">{item.reorder_point ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-textMuted tabular-nums">{money(Number(item.cost_per_unit ?? 0))}</td>
                    <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openMovement(item, 'receive')} className="rounded-md border border-borderStrong px-2 py-1 text-xs font-medium text-text hover:bg-surface">Receive</button>
                        <button onClick={() => openMovement(item, 'waste')} className="rounded-md border border-borderStrong px-2 py-1 text-xs font-medium text-text hover:bg-surface">Waste</button>
                        <button onClick={() => openEdit(item)} className="rounded-md border border-borderStrong px-2 py-1 text-xs font-medium text-text hover:bg-surface">Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {itemModalOpen && (
        <InventoryItemModal
          editingItem={editing}
          onClose={() => setItemModalOpen(false)}
          onSuccess={() => {
            setItemModalOpen(false);
            fetchData();
          }}
        />
      )}

      {movementItem && (
        <StockMovementModal
          item={movementItem}
          initialMode={movementMode}
          onClose={() => setMovementItem(null)}
          onSuccess={() => {
            setMovementItem(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
