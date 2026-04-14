import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/client';
import Dividends from './Dividends';

const emptySummary = {
  total_eur: '0.00',
  this_year_eur: '0.00',
  monthly_avg_eur: '0.00',
  paying_holdings: 0,
  monthly: [],
  by_holding: [],
};

describe('Dividends', () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url.includes('summary')) return Promise.resolve({ data: emptySummary });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders page title', () => {
    render(<MemoryRouter><Dividends /></MemoryRouter>);
    expect(screen.getByText('Dividends')).toBeTruthy();
  });

  it('renders metric card labels', () => {
    render(<MemoryRouter><Dividends /></MemoryRouter>);
    expect(screen.getByText('Total received')).toBeTruthy();
    expect(screen.getByText('This year')).toBeTruthy();
    expect(screen.getByText('Monthly avg')).toBeTruthy();
    expect(screen.getByText('Paying holdings')).toBeTruthy();
  });

  it('renders section headings', () => {
    render(<MemoryRouter><Dividends /></MemoryRouter>);
    expect(screen.getByText('Monthly income')).toBeTruthy();
    expect(screen.getByText('By holding')).toBeTruthy();
    expect(screen.getByText('Payment history')).toBeTruthy();
  });
});
