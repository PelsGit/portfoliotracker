import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Holdings from './Holdings';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/client';

const emptySummary = {
  by_holding: [],
  total_eur: '0',
  this_year_eur: '0',
  monthly_avg_eur: '0',
  paying_holdings: 0,
  monthly: [],
};

describe('Holdings', () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url.includes('summary')) return Promise.resolve({ data: emptySummary });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders Holdings and Dividends tab buttons', () => {
    render(<MemoryRouter><Holdings /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Holdings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dividends' })).toBeInTheDocument();
  });

  it('shows holdings empty state by default', async () => {
    render(<MemoryRouter><Holdings /></MemoryRouter>);
    expect(
      await screen.findByText('No holdings yet. Import transactions to see your positions.')
    ).toBeInTheDocument();
  });

  it('switches to dividends tab on click', async () => {
    render(<MemoryRouter><Holdings /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Dividends' }));
    expect(await screen.findByText('No dividend data yet. Import a DeGiro CSV to get started.')).toBeInTheDocument();
  });
});
