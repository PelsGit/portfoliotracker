import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./api/client', () => ({
  default: {
    get: () => Promise.resolve({ data: [] }),
  },
}));

describe('App', () => {
  it('renders the sidebar with navigation', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Portfolio Tracker')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Holdings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import Broker Actions' })).toBeInTheDocument();
  });

  it('renders overview page by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
  });

  it('renders import page on /import', () => {
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Drag and drop your DEGIRO CSV file here')).toBeInTheDocument();
  });
});
