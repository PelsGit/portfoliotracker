import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Overview from './Overview';

vi.mock('../api/client', () => ({
  default: {
    get: (url) => {
      if (url === '/api/portfolio/holdings') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/api/portfolio/summary') {
        return Promise.resolve({
          data: {
            total_value: null,
            total_cost: '0',
            total_return_eur: null,
            total_return_pct: null,
            holdings_count: 0,
            last_import_date: null,
          },
        });
      }
      return Promise.reject(new Error('not found'));
    },
  },
}));

describe('Overview', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
  });

  it('shows import prompt when no data', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    expect(
      await screen.findByText('Import your DEGIRO transactions to see your portfolio breakdown.')
    ).toBeInTheDocument();
  });
});
