'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, Badge, Button, Spinner } from '@ridendine/ui';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { RecipeVersionModal } from '@/components/recipes/recipe-version-modal';

interface Costing {
  perPortionFoodCost: number;
  packagingCost: number;
  totalItemCost: number;
  sellPrice: number;
  grossMargin: number;
  foodCostPct: number | null;
  suggestedPrice: number | null;
  marginWarning: boolean;
}
interface RecipeDetail {
  recipe: { id: string; name: string; menu_item_id: string | null; is_active: boolean };
  version: { id: string; version: number; batch_yield: number; portion_size: string | null; is_active: boolean } | null;
  ingredients: Array<{ id: string; name: string; quantity: number; unit: string; cost_per_unit: number; waste_factor: number }>;
  steps: Array<{ id: string; step_number: number; instruction: string; phase: string }>;
  costing: Costing;
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}
function pct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [data, setData] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionOpen, setVersionOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (res.ok) setData((await res.json()).data ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/recipes" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to recipes
        </Link>
        <p className="text-textMuted">Recipe not found.</p>
      </div>
    );
  }

  const { recipe, version, ingredients, steps, costing } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/recipes" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to recipes
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{recipe.name}</h1>
            <p className="mt-1 text-sm text-textMuted">
              {version ? `Version ${version.version}` : 'No versions'}
              {version?.portion_size ? ` · ${version.portion_size}` : ''}
              {version ? ` · batch yield ${version.batch_yield}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} aria-label="Refresh" className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted hover:text-text">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Button onClick={() => setVersionOpen(true)}><Plus className="mr-1 h-4 w-4" /> New version</Button>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Food cost / portion</p><p className="mt-1 text-2xl font-bold text-text">{money(costing.perPortionFoodCost)}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Total item cost</p><p className="mt-1 text-2xl font-bold text-text">{money(costing.totalItemCost)}</p><p className="mt-0.5 text-xs text-textMuted">incl. {money(costing.packagingCost)} packaging</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Food cost %</p><p className={`mt-1 text-2xl font-bold ${costing.marginWarning ? 'text-danger' : 'text-success'}`}>{pct(costing.foodCostPct)}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Suggested price</p><p className="mt-1 text-2xl font-bold text-text">{money(costing.suggestedPrice)}</p><p className="mt-0.5 text-xs text-textMuted">sell {money(costing.sellPrice)}</p></Card>
      </div>
      {costing.marginWarning && (
        <p className="rounded-lg bg-dangerSoft px-4 py-2 text-sm text-danger">Food cost is above the 30% target — consider raising the price or trimming ingredient cost.</p>
      )}

      {/* Ingredients */}
      <Card>
        <h2 className="mb-3 font-bold text-text">Ingredients</h2>
        {ingredients.length === 0 ? (
          <p className="text-sm text-textMuted">No ingredients on this version.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs font-semibold uppercase tracking-wide text-textSubtle">
                <th className="py-2">Ingredient</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Cost/unit</th>
                <th className="py-2 text-right">Waste</th>
                <th className="py-2 text-right">Line cost</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i) => {
                const line = Number(i.quantity) * Number(i.cost_per_unit) * (1 + Number(i.waste_factor));
                return (
                  <tr key={i.id} className="border-b border-divider last:border-0">
                    <td className="py-2 text-text">{i.name}</td>
                    <td className="py-2 text-right text-textMuted">{i.quantity} {i.unit}</td>
                    <td className="py-2 text-right text-textMuted">{money(Number(i.cost_per_unit))}</td>
                    <td className="py-2 text-right text-textMuted">{pct(Number(i.waste_factor))}</td>
                    <td className="py-2 text-right font-medium text-text">{money(line)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Steps */}
      {steps.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-text">Method</h2>
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.id} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primarySoft text-xs font-bold text-primary">{s.step_number}</span>
                <span className="text-text">
                  {s.instruction} <Badge variant="default">{s.phase}</Badge>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {versionOpen && (
        <RecipeVersionModal
          recipeId={id}
          sellPrice={costing.sellPrice}
          onClose={() => setVersionOpen(false)}
          onSuccess={() => {
            setVersionOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
