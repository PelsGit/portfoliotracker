import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ImportCsv from './ImportCsv';

describe('ImportCsv', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <ImportCsv />
      </MemoryRouter>
    );
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('renders broker selector and drop zone', () => {
    render(
      <MemoryRouter>
        <ImportCsv />
      </MemoryRouter>
    );
    expect(screen.getByText('DEGIRO')).toBeInTheDocument();
    expect(screen.getByText('MEXEM')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your DEGIRO CSV file here')).toBeInTheDocument();
    expect(screen.getByText('Browse files')).toBeInTheDocument();
  });
});
