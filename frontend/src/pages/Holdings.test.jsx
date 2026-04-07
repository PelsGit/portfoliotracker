import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Holdings from './Holdings';

vi.mock('../api/client', () => ({
  default: {
    get: () => Promise.resolve({ data: [] }),
  },
}));

describe('Holdings', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );
    expect(screen.getByText('Holdings')).toBeInTheDocument();
  });

  it('shows empty state when no holdings', async () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );
    expect(
      await screen.findByText('No holdings yet. Import transactions to see your positions.')
    ).toBeInTheDocument();
  });
});
