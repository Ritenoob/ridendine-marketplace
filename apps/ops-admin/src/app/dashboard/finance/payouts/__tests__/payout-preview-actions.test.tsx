import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@ridendine/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

global.fetch = jest.fn();

import { PayoutPreviewActions } from '../payout-preview-actions';

describe('PayoutPreviewActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs a chef payout preview and renders the total', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {
          type: 'chef',
          currency: 'CAD',
          lines: [{ amountCents: 1200 }, { amountCents: 345 }],
        },
      }),
    });

    render(<PayoutPreviewActions />);
    fireEvent.click(screen.getByRole('button', { name: /run preview/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/engine/payouts/preview',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'chef' }),
        })
      );
    });
    expect(await screen.findByText(/Chef payout preview: 2 lines, total \$15\.45/i)).toBeInTheDocument();
  });
});
