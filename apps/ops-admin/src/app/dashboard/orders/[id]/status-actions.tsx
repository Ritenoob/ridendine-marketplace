'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@ridendine/ui';
import {
  getEngineOrderAction,
  isTerminalOrderStatus,
  type EngineOrderActionKey,
  type EngineOrderActionPresentation,
} from '@ridendine/utils';

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: string;
  allowedActions: string[];
}

// Button styling is an ops-admin (dark theme) concern; the action ->
// label/api-action/success mapping is shared via @ridendine/utils.
const ACTION_BUTTON_CLASSES: Record<EngineOrderActionKey, string> = {
  accept_order: 'bg-info hover:bg-info',
  reject_order: 'bg-danger hover:bg-danger',
  start_preparing: 'bg-info hover:bg-info',
  mark_ready: 'bg-info hover:bg-info/90',
  complete_order: 'bg-success hover:bg-success',
};

export function OrderStatusActions({
  orderId,
  currentStatus,
  allowedActions,
}: OrderStatusActionsProps) {
  const router = useRouter();
  // Track which specific action is in flight so one click does not disable
  // and relabel every action button.
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const actionableItems = allowedActions
    .map((action) => ({ action, config: getEngineOrderAction(action) }))
    .filter((item): item is { action: EngineOrderActionKey; config: EngineOrderActionPresentation } =>
      Boolean(item.config)
    );

  const handleAction = async (action: string, successMessage: string) => {
    setPendingAction(action);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/engine/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(successMessage);
        router.refresh();
      } else {
        setError(result.error?.message || result.error || 'Failed to update order');
      }
    } catch {
      setError('Failed to update order');
    } finally {
      setPendingAction(null);
    }
  };

  const isTerminal = isTerminalOrderStatus(currentStatus);

  return (
    <Card className="border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Order Actions</h2>

      {error && (
        <div className="mb-4 p-3 bg-danger/20 border border-danger rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success/20 border border-success rounded-lg text-success text-sm">
          {success}
        </div>
      )}

      {isTerminal ? (
        <p className="text-textMuted">
          This order is in a terminal state ({currentStatus}) and cannot be modified.
        </p> 
      ) : actionableItems.length === 0 ? (
        <p className="text-textMuted">No engine-backed actions are currently available.</p>
      ) : (
        <>
          <p className="text-textMuted mb-4">
            Current status:{' '}
            <span className="text-white font-medium">{currentStatus}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {actionableItems.map(({ action, config }) => (
              <button
                key={action}
                onClick={() => handleAction(config.apiAction, config.successMessage)}
                disabled={pendingAction !== null}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_BUTTON_CLASSES[action]}`}
              >
                {pendingAction === config.apiAction ? 'Updating...' : config.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-textMuted mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-surfaceMuted text-white rounded-lg hover:bg-surfaceMuted transition-colors"
          >
            Print Order
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(orderId);
              setSuccess('Order ID copied to clipboard');
            }}
            className="px-4 py-2 bg-surfaceMuted text-white rounded-lg hover:bg-surfaceMuted transition-colors"
          >
            Copy Order ID
          </button>
        </div>
      </div>
    </Card>
  );
}
