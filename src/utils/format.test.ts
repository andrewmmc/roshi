import { describe, expect, it } from 'vitest';
import { formatCount } from './format';

describe('formatCount', () => {
  it('returns plain numbers below 1k', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands with one decimal and k suffix', () => {
    expect(formatCount(1_000)).toBe('1.0k');
    expect(formatCount(1_500)).toBe('1.5k');
    expect(formatCount(999_999)).toBe('1000.0k');
  });

  it('formats millions with one decimal and M suffix', () => {
    expect(formatCount(1_000_000)).toBe('1.0M');
    expect(formatCount(2_500_000)).toBe('2.5M');
  });
});
