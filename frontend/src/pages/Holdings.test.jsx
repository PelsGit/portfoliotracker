import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Holdings from './Holdings';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/client';

const emptySummary = { by_holding: [], total_eur: '0', this_year_eur: '0', monthly_avg_eur: '0', paying_holdings: 0, monthly: [] };

describe('Holdings', () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url.includes('summary')) return Promise.resolve({ data: emptySummary });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders page title', () => {
    render(<MemoryRouter><Holdings /></MemoryRouter>);
    expect(screen.getByText('Holdings')).toBeInTheDocument();
  });

  it('shows empty state when no holdings', async () => {
    render(<MemoryRouter><Holdings /></MemoryRouter>);
    expect(
      await screen.findByText('No holdings yet. Import transactions to see your positions.')
    ).toBeInTheDocument();
  });

  it('renders dividends segment header', () => {
    render(<MemoryRouter><Holdings /></MemoryRouter>);
    expect(screen.getByText('Dividends')).toBeInTheDocument();
    expect(screen.getByText('Total received per holding')).toBeInTheDocument();
  });
});
