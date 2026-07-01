'use client';

import { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@ridendine/ui';

export interface InventoryItemLite {
  id: string;
  name: string;
  unit: string;
  current_quantity: number;
}

type Mode = 'receive' | 'waste' | 'adjust';

const MODE_LABEL: Record<Mode, string> = {
  receive: 'Receive stock',
  waste: 'Log waste',
  adjust: 'Manual adjustment',
};

interface StockMovementModalProps {
  item: InventoryItemLite;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess: (updatedItem: unknown) => void;
}

/**
 * Records a stock movement for one item:
 *  - receive -> POST /api/inventory/[id]/movement (magnitude, type receive)
 *  - waste   -> POST /api/inventory/waste
 *  - adjust  -> POST /api/inventory/[id]/movement (signedQuantity, type adjustment)
 */
export function StockMovementModal({ item, initialMode = 'receive', onClose, onSuccess }: StockMovementModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isFinite(amountNum) && (mode === 'adjust' || amountNum > 0);

  const submit = async () => {
    if (!amountValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let res: Response;
      if (mode === 'waste') {
        res = await fetch('/api/inventory/waste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inventoryItemId: item.id, quantity: Math.abs(amountNum), reason: reason || null }),
        });
      } else if (mode === 'adjust') {
        res = await fetch(`/api/inventory/${item.id}/movement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movementType: 'adjustment', signedQuantity: amountNum, note: reason || null }),
        });
      } else {
        res = await fetch(`/api/inventory/${item.id}/movement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movementType: 'receive', magnitude: Math.abs(amountNum), note: reason || null }),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      onSuccess(json?.data?.item ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`${MODE_LABEL[mode]} — ${item.name}`} size="sm">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['receive', 'waste', 'adjust'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-primary text-white' : 'bg-surfaceMuted text-textMuted hover:text-text'
              }`}
            >
              {m === 'receive' ? 'Receive' : m === 'waste' ? 'Waste' : 'Adjust'}
            </button>
          ))}
        </div>

        <p className="text-sm text-textMuted">
          On hand now: <span className="font-semibold text-text">{item.current_quantity} {item.unit}</span>
        </p>

        <Input
          label={mode === 'adjust' ? `Signed quantity (${item.unit}) — use a minus sign to remove` : `Quantity (${item.unit})`}
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={mode === 'adjust' ? 'e.g. -2 or 5' : 'e.g. 10'}
          autoFocus
        />

        <Textarea
          label={mode === 'waste' ? 'Reason' : 'Note (optional)'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={mode === 'waste' ? 'Spoiled, dropped, over-prepped…' : ''}
        />

        {error && <p className="rounded-lg bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!amountValid || submitting}>
            {submitting ? 'Saving…' : MODE_LABEL[mode]}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
