import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/client';
import Calendar from './Calendar';

describe('Calendar', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [] });
  });

  it('renders page title', async () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect(screen.getByText('Earnings Calendar')).toBeTruthy();
  });

  it('renders weekday headers', async () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
  });
});
