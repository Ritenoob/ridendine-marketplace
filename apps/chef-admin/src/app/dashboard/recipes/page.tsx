'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Badge, Button, EmptyState, Spinner } from '@ridendine/ui';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { RecipeBuilderModal, type MenuItemLite } from '@/components/recipes/recipe-builder-modal';

interface Recipe {
  id: string;
  name: string;
  menu_item_id: string | null;
  is_active: boolean;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rRes, mRes] = await Promise.all([fetch('/api/recipes'), fetch('/api/menu')]);
      if (rRes.ok) setRecipes((await rRes.json()).data?.recipes ?? []);
      if (mRes.ok) {
        const items = (await mRes.json()).data?.menuItems ?? [];
        setMenuItems(items.map((m: { id: string; name: string; price: number }) => ({ id: m.id, name: m.name, price: Number(m.price ?? 0) })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const menuNameById = new Map(menuItems.map((m) => [m.id, m.name]));

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
          <h1 className="text-2xl font-bold text-text">Recipes</h1>
          <p className="mt-1 text-sm text-textMuted">Build recipes, attach them to menu items, and see real food cost and margin.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} aria-label="Refresh" className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted hover:text-text">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Button onClick={() => setBuilderOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New recipe
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No recipes yet"
          description="Create your first recipe to track ingredient cost, food-cost %, and margin per menu item."
          action={<Button onClick={() => setBuilderOpen(true)}><Plus className="mr-1 h-4 w-4" />Build a recipe</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-text">{r.name}</p>
                  <p className="mt-0.5 text-xs text-textMuted">
                    {r.menu_item_id ? menuNameById.get(r.menu_item_id) ?? 'Linked menu item' : 'Not linked to a menu item'}
                  </p>
                </div>
                <Badge variant={r.is_active ? 'success' : 'default'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {builderOpen && (
        <RecipeBuilderModal
          menuItems={menuItems}
          onClose={() => setBuilderOpen(false)}
          onSuccess={() => {
            setBuilderOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
