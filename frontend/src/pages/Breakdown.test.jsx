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

const EMPTY_GOALS = { sector: [], region: [], asset_type: [] };

vi.mock('../api/client', () => ({
  default: {
    get: (url) => {
      if (url.includes('goals')) return Promise.resolve({ data: EMPTY_GOALS });
      return Promise.resolve({ data: MOCK_BREAKDOWN });
    },
    put: () => Promise.resolve({ data: [] }),
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

  it('renders tab buttons', async () => {
    render(
      <MemoryRouter>
        <Breakdown />
      </MemoryRouter>
    );
    expect(await screen.findByText('Allocation')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('renders breakdown table data', async () => {
    render(
      <MemoryRouter>
        <Breakdown />
      </MemoryRouter>
    );
    expect((await screen.findAllByText('Technology')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Healthcare').length).toBeGreaterThan(0);
    expect(screen.getAllByText('North America').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stock').length).toBeGreaterThan(0);
  });
});
