import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Performance from './Performance';

vi.mock('../api/client', () => ({
  default: {
    get: () =>
      Promise.resolve({
        data: {
          time_series: [],
          total_return_eur: null,
          total_return_pct: null,
          twr: null,
          twr_cumulative: null,
          irr: null,
          max_drawdown: null,
        },
      }),
  },
}));

vi.mock('recharts', async () => {
  const React = await import('react');
  return {
    ResponsiveContainer: ({ children }) => React.createElement('div', null, children),
    LineChart: ({ children }) => React.createElement('div', null, children),
    Line: () => React.createElement('div'),
    XAxis: () => React.createElement('div'),
    YAxis: () => React.createElement('div'),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div'),
  };
});

describe('Performance', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Performance />
      </MemoryRouter>
    );
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('renders all period buttons', () => {
    render(
      <MemoryRouter>
        <Performance />
      </MemoryRouter>
    );
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('3M')).toBeInTheDocument();
    expect(screen.getByText('6M')).toBeInTheDocument();
    expect(screen.getByText('1Y')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders metric cards', () => {
    render(
      <MemoryRouter>
        <Performance />
      </MemoryRouter>
    );
    expect(screen.getByText('Total Return')).toBeInTheDocument();
    expect(screen.getByText('TWR')).toBeInTheDocument();
    expect(screen.getByText('IRR')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
  });
});
