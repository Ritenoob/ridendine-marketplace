'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Badge, Button, Modal, Input, EmptyState, Spinner } from '@ridendine/ui';
import { Users, Plus, RefreshCw } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  role: string | null;
  hourly_rate: number;
  is_active: boolean;
}
interface Today {
  laborHours: number;
  laborCost: number;
  activeCount: number;
  onClock: Array<{ staffId: string; name: string | null; hours: number }>;
}

function money(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export default function LabourPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newRate, setNewRate] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, tRes] = await Promise.all([fetch('/api/labor/staff'), fetch('/api/labor/today')]);
      if (sRes.ok) setStaff((await sRes.json()).data?.staff ?? []);
      if (tRes.ok) setToday((await tRes.json()).data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onClockIds = new Set((today?.onClock ?? []).map((o) => o.staffId));

  const clock = async (staffId: string, dir: 'in' | 'out') => {
    setBusy((b) => ({ ...b, [staffId]: true }));
    try {
      await fetch(`/api/labor/clock-${dir}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      await fetchData();
    } finally {
      setBusy((b) => ({ ...b, [staffId]: false }));
    }
  };

  const addStaff = async () => {
    if (!newName.trim() || savingStaff) return;
    setSavingStaff(true);
    try {
      const res = await fetch('/api/labor/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), role: newRole.trim() || null, hourlyRate: Number(newRate) || 0 }),
      });
      if (res.ok) {
        setAddOpen(false);
        setNewName('');
        setNewRole('');
        setNewRate('');
        await fetchData();
      }
    } finally {
      setSavingStaff(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Labour</h1>
          <p className="mt-1 text-sm text-textMuted">Track staff time and today&apos;s labour cost.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} aria-label="Refresh" className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted hover:text-text">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Button onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add staff</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">On the clock</p><p className="mt-1 text-2xl font-bold text-text">{today?.activeCount ?? 0}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Hours today</p><p className="mt-1 text-2xl font-bold text-text">{today?.laborHours ?? 0}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Labour cost today</p><p className="mt-1 text-2xl font-bold text-text">{money(today?.laborCost ?? 0)}</p></Card>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No staff yet"
          description="Add your kitchen staff to track time and labour cost."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" />Add staff</Button>}
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs font-semibold uppercase tracking-wide text-textSubtle">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const on = onClockIds.has(s.id);
                return (
                  <tr key={s.id} className="border-b border-divider">
                    <td className="px-4 py-3 font-medium text-text">{s.name}</td>
                    <td className="px-4 py-3 text-textMuted">{s.role ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-textMuted">{money(Number(s.hourly_rate ?? 0))}/h</td>
                    <td className="px-4 py-3">{on ? <Badge variant="success">On clock</Badge> : <Badge variant="default">Off</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant={on ? 'outline' : 'default'} disabled={Boolean(busy[s.id])} onClick={() => clock(s.id, on ? 'out' : 'in')}>
                        {busy[s.id] ? '…' : on ? 'Clock out' : 'Clock in'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {addOpen && (
        <Modal isOpen onClose={() => setAddOpen(false)} title="Add staff" size="sm">
          <div className="space-y-3">
            <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <Input label="Role" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Prep, Line, Dish…" />
            <Input label="Hourly rate ($)" type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={savingStaff}>Cancel</Button>
              <Button onClick={addStaff} disabled={!newName.trim() || savingStaff}>{savingStaff ? 'Saving…' : 'Add'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
