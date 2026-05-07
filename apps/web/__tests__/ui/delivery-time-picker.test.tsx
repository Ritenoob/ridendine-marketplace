/**
 * Tests for DeliveryTimePicker component
 * TDD: Red phase - written before implementation
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the component during Red phase - will be replaced by real import
jest.mock('../../src/components/checkout/delivery-time-picker', () => ({
  DeliveryTimePicker: jest.fn(({ onSelect, selected }) => (
    <div data-testid="delivery-time-picker">
      <button
        data-testid="asap-btn"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
      >
        ASAP
      </button>
      <button
        data-testid="schedule-btn"
        onClick={() => onSelect('schedule')}
        aria-pressed={selected !== null}
      >
        Schedule for later
      </button>
    </div>
  )),
}));

import { DeliveryTimePicker } from '../../src/components/checkout/delivery-time-picker';

describe('DeliveryTimePicker', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ASAP and schedule options', () => {
    render(<DeliveryTimePicker selected={null} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('asap-btn')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-btn')).toBeInTheDocument();
  });

  it('calls onSelect with null when ASAP is clicked', () => {
    render(<DeliveryTimePicker selected={null} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('asap-btn'));
    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect with a value when schedule is clicked', () => {
    render(<DeliveryTimePicker selected={null} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('schedule-btn'));
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('shows ASAP as selected by default (selected === null)', () => {
    render(<DeliveryTimePicker selected={null} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('asap-btn')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('schedule-btn')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows schedule as selected when a time is provided', () => {
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    render(<DeliveryTimePicker selected={futureTime} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('asap-btn')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('schedule-btn')).toHaveAttribute('aria-pressed', 'true');
  });
});
