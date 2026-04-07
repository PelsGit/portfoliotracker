import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from './format';

describe('formatCurrency', () => {
  it('formats a positive EUR value', () => {
    const result = formatCurrency(3781.0);
    expect(result).toContain('3.781');
  });

  it('returns dash for null', () => {
    expect(formatCurrency(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('formats with default decimals', () => {
    const result = formatNumber(1234.5);
    expect(result).toContain('1.234,50');
  });

  it('formats with zero decimals', () => {
    const result = formatNumber(1234.5, 0);
    expect(result).toContain('1.235') ;
  });

  it('returns dash for null', () => {
    expect(formatNumber(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formats a percentage', () => {
    const result = formatPercent(12.5);
    expect(result).toContain('12,50');
    expect(result).toContain('%');
  });

  it('returns dash for null', () => {
    expect(formatPercent(null)).toBe('—');
  });
});
