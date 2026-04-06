import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Overview from './Overview';

describe('Overview', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
  });

  it('shows import prompt when no data', () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    expect(
      screen.getByText('Import your DEGIRO transactions to see your portfolio breakdown.')
    ).toBeInTheDocument();
  });
});
