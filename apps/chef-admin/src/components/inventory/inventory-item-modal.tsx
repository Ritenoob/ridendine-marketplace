'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@ridendine/ui';

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  current_quantity: number;
  par_quantity: number | null;
  reorder_point: number | null;
  cost_per_unit: number;
  expiry_date: string | null;
  lot_code: string | null;
  is_active: boolean;
}

interface InventoryItemModalProps {
  editingItem: InventoryItem | null;
  onClose: () => void;
  onSuccess: (item: InventoryItem) => void;
}

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function InventoryItemModal({ editingItem, onClose, onSuccess }: InventoryItemModalProps) {
  const isEdit = editingItem !== null;
  const [name, setName] = useState(editingItem?.name ?? '');
  const [category, setCategory] = useState(editingItem?.category ?? '');
  const [unit, setUnit] = useState(editingItem?.unit ?? 'unit');
  const [initialQuantity, setInitialQuantity] = useState('0');
  const [parQuantity, setParQuantity] = useState(editingItem?.par_quantity?.toString() ?? '');
  const [reorderPoint, setReorderPoint] = useState(editingItem?.reorder_point?.toString() ?? '');
  const [costPerUnit, setCostPerUnit] = useState(editingItem?.cost_per_unit?.toString() ?? '0');
  const [expiryDate, setExpiryDate] = useState(editingItem?.expiry_date ?? '');
  const [lotCode, setLotCode] = useState(editingItem?.lot_code ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const commonBody = {
        name: name.trim(),
        category: category.trim() || null,
        unit: unit.trim() || 'unit',
        parQuantity: numOrNull(parQuantity),
        reorderPoint: numOrNull(reorderPoint),
        costPerUnit: numOrNull(costPerUnit) ?? 0,
        expiryDate: expiryDate || null,
        lotCode: lotCode.trim() || null,
      };

      const res = isEdit
        ? await fetch(`/api/inventory/${editingItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commonBody),
          })
        : await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...commonBody, initialQuantity: numOrNull(initialQuantity) ?? 0 }),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      onSuccess(json?.data?.item as InventoryItem);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? `Edit ${editingItem?.name}` : 'Add inventory item'} size="md">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Produce, Protein…" />
          <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, L, each…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {!isEdit && (
            <Input label="Opening quantity" type="number" inputMode="decimal" value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} />
          )}
          <Input label="Cost per unit ($)" type="number" inputMode="decimal" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Par quantity" type="number" inputMode="decimal" value={parQuantity} onChange={(e) => setParQuantity(e.target.value)} hint="Target stock level" />
          <Input label="Reorder point" type="number" inputMode="decimal" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} hint="Low-stock threshold" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Expiry date" type="date" value={expiryDate ?? ''} onChange={(e) => setExpiryDate(e.target.value)} />
          <Input label="Lot / batch code" value={lotCode} onChange={(e) => setLotCode(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
