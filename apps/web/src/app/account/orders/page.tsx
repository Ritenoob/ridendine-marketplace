'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { buildCustomerOrderWorkflow } from '@/lib/orders/customer-order-workflow';
import { Card, Badge, Button, NoOrdersEmpty, Spinner } from '@ridendine/ui';

interface OrderItem {
  id: string;
  quantity: number;
  menu_item: { id: string; name: string } | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  storefront?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/orders');
        const json = await response.json();
        if (!response.ok || !json.success) {
          setError(json.error || 'Unable to load orders');
          return;
        }
        const rows = (json.data?.orders || []) as Order[];
        // Fetch items for completed/delivered orders to enable reorder
        const enriched = await Promise.all(
          rows.map(async (order) => {
            if (!['delivered', 'completed'].includes(order.status)) return order;
            try {
              const res = await fetch(`/api/orders/${order.id}`);
              if (!res.ok) return order;
              const detail = await res.json();
              return { ...order, items: detail.data?.order?.items ?? [] };
            } catch {
              return order;
            }
          })
        );
        setOrders(enriched);
      } catch (error) {
        console.error('Failed to fetch orders:', error instanceof Error ? error.message : 'unknown');
        setError('Unable to load orders right now');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchOrders();
    }
  }, [user, authLoading]);

  const handleReorder = useCallback(async (order: Order) => {
    if (!order.storefront?.id) return;
    setReorderingId(order.id);
    setReorderError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/reorder`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) {
        setReorderError(json?.error || 'Unable to reorder right now');
        return;
      }

      router.push(`/cart?storefrontId=${order.storefront.id}`);
    } catch {
      setReorderError('Unable to reorder right now');
    } finally {
      setReorderingId(null);
    }
  }, [router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">Order History</h1>
          <Link href="/account">
            <Button variant="ghost" size="sm">
              ← Back to Account
            </Button>
          </Link>
        </div>

        {error ? (
          <Card className="mt-8 p-6">
            <p className="text-sm text-danger">{error}</p>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="mt-8">
            <NoOrdersEmpty />
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            {reorderError && (
              <Card className="p-4">
                <p className="text-sm text-danger">{reorderError}</p>
              </Card>
            )}
            {orders.map((order) => {
              const workflow = buildCustomerOrderWorkflow({
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                itemCount: order.items?.length ?? 0,
              });

              return (
                <Card key={order.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-text">
                          #{order.order_number}
                        </span>
                        <Badge variant={workflow.statusTone}>
                          {workflow.statusLabel}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-textMuted">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="mt-2 text-sm text-text">
                        {workflow.nextStepLabel}
                      </p>
                      {order.storefront && (
                        <Link
                          href={`/chefs/${order.storefront.slug}`}
                          className="mt-1 inline-flex text-sm text-primary transition-colors hover:underline"
                        >
                          {order.storefront.name}
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 sm:items-end">
                      <span className="font-semibold text-text">
                        ${Number(order.total).toFixed(2)}
                      </span>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Link href={workflow.detailHref}>
                          <Button variant="secondary" size="sm">
                            {workflow.primaryActionLabel}
                          </Button>
                        </Link>
                        <Link href={workflow.supportHref}>
                          <Button variant="outline" size="sm">
                            Contact support
                          </Button>
                        </Link>
                        {workflow.canReorder && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={reorderingId === order.id}
                            loading={reorderingId === order.id}
                            onClick={() => void handleReorder(order)}
                          >
                            {reorderingId === order.id ? 'Adding...' : 'Reorder'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
