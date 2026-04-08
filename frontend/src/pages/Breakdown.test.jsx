import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Breakdown from './Breakdown';

const MOCK_BREAKDOWN = {
  sector: [
    { name: 'Technology', value: 1500, weight: 60, holdings_count: 2 },
    { name: 'Healthcare', value: 1000, weight: 40, holdings_count: 1 },
  ],
  region: [
    { name: 'North America', value: 2000, weight: 80, holdings_count: 2 },
    { name: 'Europe', value: 500, weight: 20, holdings_count: 1 },
  ],
  asset_type: [
    { name: 'Stock', value: 2500, weight: 100, holdings_count: 3 },
  ],
};

vi.mock('../api/client', () => ({
  default: {
    get: () => Promise.resolve({ data: MOCK_BREAKDOWN }),
  },
}));

vi.mock('recharts', async () => {
  const React = await import('react');
  return {
    ResponsiveContainer: ({ children }) => React.createElement('div', null, children),
    PieChart: ({ children }) => React.createElement('div', null, children),
    Pie: () => React.createElement('div'),
    Cell: () => React.createElement('div'),
    Legend: () => React.createElement('div'),
    BarChart: ({ children }) => React.createElement('div', null, children),
    Bar: () => React.createElement('div'),
    XAxis: () => React.createElement('div'),
    YAxis: () => React.createElement('div'),
    Tooltip: () => React.createElement('div'),
  };
});

describe('Breakdown', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Breakdown />
      </MemoryRouter>
    );
    expect(screen.getByText('Breakdown')).toBeInTheDocument();
  });

  it('renders all section titles', async () => {
    render(
      <MemoryRouter>
        <Breakdown />
      </MemoryRouter>
    );
    expect(await screen.findByText('Sector Allocation')).toBeInTheDocument();
    expect(screen.getByText('Region Allocation')).toBeInTheDocument();
    expect(screen.getByText('Asset Type')).toBeInTheDocument();
  });

  it('renders breakdown table data', async () => {
    render(
      <MemoryRouter>
        <Breakdown />
      </MemoryRouter>
    );
    expect(await screen.findByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
  });
});
