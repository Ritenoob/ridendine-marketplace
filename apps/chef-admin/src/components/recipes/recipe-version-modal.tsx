'use client';

import { useMemo, useState } from 'react';
import { Modal, Button, Input } from '@ridendine/ui';
import { computeMenuItemCosting } from '@ridendine/engine';
import { Plus, Trash2 } from 'lucide-react';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  wasteFactor: string;
}

interface RecipeVersionModalProps {
  recipeId: string;
  sellPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}
function pct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function RecipeVersionModal({ recipeId, sellPrice, onClose, onSuccess }: RecipeVersionModalProps) {
  const [batchYield, setBatchYield] = useState('1');
  const [notes, setNotes] = useState('');
  const [activate, setActivate] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '', unit: 'unit', costPerUnit: '', wasteFactor: '0' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const costing = useMemo(
    () =>
      computeMenuItemCosting({
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({ quantity: num(i.quantity), costPerUnit: num(i.costPerUnit), wasteFactor: num(i.wasteFactor) })),
        batchYield: num(batchYield) || 1,
        sellPrice,
      }),
    [ingredients, batchYield, sellPrice]
  );

  const setIng = (idx: number, patch: Partial<Ingredient>) => setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        batchYield: num(batchYield) || 1,
        notes: notes.trim() || null,
        activate,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i, idx) => ({ name: i.name.trim(), quantity: num(i.quantity), unit: i.unit.trim() || 'unit', costPerUnit: num(i.costPerUnit), wasteFactor: num(i.wasteFactor), sortOrder: idx })),
        steps: [],
      };
      const res = await fetch(`/api/recipes/${recipeId}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error || `Request failed (${res.status})`);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New recipe version" size="xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Batch yield (portions)" type="number" inputMode="decimal" value={batchYield} onChange={(e) => setBatchYield(e.target.value)} autoFocus />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed in this version" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-text">Ingredients</h3>
            <button onClick={() => setIngredients((p) => [...p, { name: '', quantity: '', unit: 'unit', costPerUnit: '', wasteFactor: '0' }])} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_70px_70px_80px_70px_32px] items-center gap-2">
                <input placeholder="Name" value={ing.name} onChange={(e) => setIng(idx, { name: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="Qty" type="number" value={ing.quantity} onChange={(e) => setIng(idx, { quantity: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="Unit" value={ing.unit} onChange={(e) => setIng(idx, { unit: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="$/unit" type="number" value={ing.costPerUnit} onChange={(e) => setIng(idx, { costPerUnit: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="Waste" type="number" value={ing.wasteFactor} onChange={(e) => setIng(idx, { wasteFactor: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <button onClick={() => setIngredients((p) => p.filter((_, i) => i !== idx))} aria-label="Remove" className="flex h-9 w-8 items-center justify-center rounded-lg text-textMuted hover:bg-dangerSoft hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-divider bg-surfaceMuted p-3 sm:grid-cols-4">
          <div><p className="text-xs text-textMuted">Cost / portion</p><p className="text-lg font-bold text-text">{money(costing.perPortionFoodCost)}</p></div>
          <div><p className="text-xs text-textMuted">Sell price</p><p className="text-lg font-bold text-text">{money(sellPrice)}</p></div>
          <div><p className="text-xs text-textMuted">Food cost %</p><p className={`text-lg font-bold ${costing.marginWarning ? 'text-danger' : 'text-success'}`}>{pct(costing.foodCostPct)}</p></div>
          <div><p className="text-xs text-textMuted">Suggested price</p><p className="text-lg font-bold text-text">{money(costing.suggestedPrice)}</p></div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} className="h-4 w-4 rounded border-borderStrong" />
          Make this the active version (used for menu costing)
        </label>

        {error && <p className="rounded-lg bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : 'Save version'}</Button>
        </div>
      </div>
    </Modal>
  );
}
