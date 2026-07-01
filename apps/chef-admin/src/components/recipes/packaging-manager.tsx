'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Modal, Input } from '@ridendine/ui';
import { Plus, Pencil } from 'lucide-react';

interface PackagingItem {
  id: string;
  name: string;
  unit: string | null;
  cost_per_unit: number;
  is_active: boolean;
}

function money(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export function PackagingManager() {
  const [items, setItems] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PackagingItem | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/packaging');
      if (res.ok) setItems((await res.json()).data?.packaging ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setUnit('');
    setCost('');
    setOpen(true);
  };
  const openEdit = (p: PackagingItem) => {
    setEditing(p);
    setName(p.name);
    setUnit(p.unit ?? '');
    setCost(String(p.cost_per_unit ?? ''));
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), unit: unit.trim() || null, costPerUnit: Number(cost) || 0 };
      const res = editing
        ? await fetch(`/api/packaging/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/packaging', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setOpen(false);
        await fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-text">Packaging</h2>
          <p className="text-xs text-textMuted">Costs here roll into each item&apos;s total cost and margin.</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Add</Button>
      </div>

      {loading ? (
        <p className="py-2 text-sm text-textMuted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-2 text-sm text-textMuted">No packaging items yet.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-divider px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text">{p.name}</p>
                <p className="text-xs text-textMuted">{money(Number(p.cost_per_unit ?? 0))}{p.unit ? ` / ${p.unit}` : ''}</p>
              </div>
              <button onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} className="rounded-md p-1 text-textMuted hover:bg-surfaceMuted hover:text-text">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : 'Add packaging'} size="sm">
          <div className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Clamshell, bag, lid…" autoFocus />
            <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="each" />
            <Input label="Cost per unit ($)" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={!name.trim() || saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
