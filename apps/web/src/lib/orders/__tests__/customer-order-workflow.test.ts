import { buildCustomerOrderWorkflow, customerOrderSupportHref } from '../customer-order-workflow';

describe('customer order workflow presentation', () => {
  it('presents an active preparing order with tracking and support context', () => {
    const workflow = buildCustomerOrderWorkflow({
      id: 'order-1',
      orderNumber: 'R-1001',
      status: 'preparing',
      itemCount: 2,
    });

    expect(workflow.statusLabel).toBe('Being prepared');
    expect(workflow.statusTone).toBe('info');
    expect(workflow.nextStepLabel).toBe('The chef is preparing your order.');
    expect(workflow.primaryActionLabel).toBe('Track order');
    expect(workflow.detailHref).toBe('/orders/order-1/confirmation');
    expect(workflow.supportHref).toBe('/contact?topic=order-support&orderId=order-1&orderNumber=R-1001');
    expect(workflow.canReorder).toBe(false);
  });

  it('allows reorder only for delivered or completed orders with items', () => {
    expect(
      buildCustomerOrderWorkflow({
        id: 'order-2',
        orderNumber: 'R-1002',
        status: 'delivered',
        itemCount: 1,
      }).canReorder
    ).toBe(true);

    expect(
      buildCustomerOrderWorkflow({
        id: 'order-3',
        orderNumber: 'R-1003',
        status: 'completed',
        itemCount: 0,
      }).canReorder
    ).toBe(false);

    expect(
      buildCustomerOrderWorkflow({
        id: 'order-4',
        orderNumber: 'R-1004',
        status: 'accepted',
        itemCount: 1,
      }).canReorder
    ).toBe(false);
  });

  it('uses customer-safe copy for delivered and cancelled statuses', () => {
    const delivered = buildCustomerOrderWorkflow({
      id: 'order-5',
      orderNumber: 'R-1005',
      status: 'completed',
      itemCount: 2,
    });
    expect(delivered.statusLabel).toBe('Delivered');
    expect(delivered.statusTone).toBe('success');
    expect(delivered.nextStepLabel).toBe('Ready to review or reorder.');
    expect(delivered.primaryActionLabel).toBe('View receipt');

    const cancelled = buildCustomerOrderWorkflow({
      id: 'order-6',
      orderNumber: 'R-1006',
      status: 'cancelled',
      itemCount: 2,
    });
    expect(cancelled.statusLabel).toBe('Cancelled');
    expect(cancelled.statusTone).toBe('error');
    expect(cancelled.nextStepLabel).toBe('No further action is needed. Contact support if something looks off.');
    expect(cancelled.primaryActionLabel).toBe('View details');
    expect(cancelled.canReorder).toBe(false);
  });

  it('encodes support handoff query values', () => {
    expect(customerOrderSupportHref({ id: 'order 7', orderNumber: 'R #1007' })).toBe(
      '/contact?topic=order-support&orderId=order+7&orderNumber=R+%231007'
    );
  });
});
