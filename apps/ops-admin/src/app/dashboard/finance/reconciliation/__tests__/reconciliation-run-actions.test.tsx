import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@ridendine/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

global.fetch = jest.fn();

import { ReconciliationRunActions } from '../reconciliation-run-actions';

describe('ReconciliationRunActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs daily reconciliation and renders zero discrepancies', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {
          examined: 3,
          matched: 3,
          unmatched: 0,
          disputed: 0,
          persistFailed: 0,
        },
      }),
    });

    render(<ReconciliationRunActions />);
    fireEvent.click(screen.getByRole('button', { name: /run reconciliation/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/engine/reconciliation',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"run_daily"'),
        })
      );
    });
    expect(await screen.findByText(/zero discrepancies across 3 examined events/i)).toBeInTheDocument();
  });
});
