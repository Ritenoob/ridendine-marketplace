import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Mock @ridendine/db
const mockSupabase = { __id: 'browser-client' };
const mockSearchOrdersByNumber = jest.fn();
const mockSearchCustomersByText = jest.fn();
const mockSearchChefsByName = jest.fn();
const mockSearchDriversByName = jest.fn();
jest.mock('@ridendine/db', () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
  searchOrdersByNumber: (...args: unknown[]) => mockSearchOrdersByNumber(...args),
  searchCustomersByText: (...args: unknown[]) => mockSearchCustomersByText(...args),
  searchChefsByName: (...args: unknown[]) => mockSearchChefsByName(...args),
  searchDriversByName: (...args: unknown[]) => mockSearchDriversByName(...args),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { GlobalSearch } from '../global-search';

function installSearchResults({
  orders = [] as any[],
  customers = [] as any[],
  chefs = [] as any[],
  drivers = [] as any[],
} = {}) {
  mockSearchOrdersByNumber.mockResolvedValue(orders);
  mockSearchCustomersByText.mockResolvedValue(customers);
  mockSearchChefsByName.mockResolvedValue(chefs);
  mockSearchDriversByName.mockResolvedValue(drivers);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  installSearchResults();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GlobalSearch', () => {
  it('renders the search trigger button', () => {
    render(<GlobalSearch />);
    expect(screen.getByRole('button', { name: /open search/i })).toBeInTheDocument();
  });

  it('shows Search text and keyboard shortcut', () => {
    render(<GlobalSearch />);
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('opens palette when trigger button is clicked', async () => {
    render(<GlobalSearch />);
    const btn = screen.getByRole('button', { name: /open search/i });
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByPlaceholderText(/search orders/i)).toBeInTheDocument();
  });

  it('opens palette on Cmd+K keydown', async () => {
    render(<GlobalSearch />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(screen.getByPlaceholderText(/search orders/i)).toBeInTheDocument();
  });

  it('opens palette on Ctrl+K keydown', async () => {
    render(<GlobalSearch />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByPlaceholderText(/search orders/i)).toBeInTheDocument();
  });

  it('closes palette on Escape keydown', async () => {
    render(<GlobalSearch />);
    await act(async () => { fireEvent.keyDown(window, { key: 'k', metaKey: true }); });
    expect(screen.getByPlaceholderText(/search orders/i)).toBeInTheDocument();
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(screen.queryByPlaceholderText(/search orders/i)).not.toBeInTheDocument();
  });

  it('shows prompt to type 2 chars when opened', async () => {
    render(<GlobalSearch />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open search/i })); });
    expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument();
  });

  it('shows "No results found" when query returns empty', async () => {
    installSearchResults();
    render(<GlobalSearch />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open search/i })); });
    const input = screen.getByPlaceholderText(/search orders/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'xyz' } }); });
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('displays order result from search', async () => {
    const orderRows = [
      { id: 'ord1', order_number: 'ORD-001', status: 'pending', total: '25.00' },
    ];
    installSearchResults({ orders: orderRows });

    render(<GlobalSearch />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open search/i })); });
    const input = screen.getByPlaceholderText(/search orders/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'ORD' } }); });
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => {
      expect(screen.getByText('Order ORD-001')).toBeInTheDocument();
    });
  });

  it('navigates on result click', async () => {
    const orderRows = [
      { id: 'ord1', order_number: 'ORD-001', status: 'pending', total: '25.00' },
    ];
    installSearchResults({ orders: orderRows });

    render(<GlobalSearch />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open search/i })); });
    const input = screen.getByPlaceholderText(/search orders/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'ORD' } }); });
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => screen.getByText('Order ORD-001'));
    await act(async () => { fireEvent.click(screen.getByText('Order ORD-001')); });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/orders/ord1');
  });

  it('navigates with Enter key on selected result', async () => {
    const orderRows = [
      { id: 'ord1', order_number: 'ORD-001', status: 'pending', total: '25.00' },
    ];
    installSearchResults({ orders: orderRows });

    render(<GlobalSearch />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open search/i })); });
    const input = screen.getByPlaceholderText(/search orders/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'ORD' } }); });
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => screen.getByText('Order ORD-001'));
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/orders/ord1');
  });
});
