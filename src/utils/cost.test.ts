import { estimateCostUsd, formatCostUsd } from './cost';

describe('estimateCostUsd', () => {
  const pricing = { inputPerMTokens: 5, outputPerMTokens: 15 };

  it('returns null when pricing is missing', () => {
    expect(
      estimateCostUsd({
        pricing: null,
        promptTokens: 1000,
        completionTokens: 1000,
      }),
    ).toBe(null);
  });

  it('returns null when both token counts are missing', () => {
    expect(
      estimateCostUsd({
        pricing,
        promptTokens: null,
        completionTokens: undefined,
      }),
    ).toBe(null);
  });

  it('computes cost from prompt + completion tokens', () => {
    const cost = estimateCostUsd({
      pricing,
      promptTokens: 1_000_000,
      completionTokens: 500_000,
    });
    // 1M * 5 + 0.5M * 15 = 5 + 7.5 = 12.5
    expect(cost).toBeCloseTo(12.5, 6);
  });

  it('treats missing one side as zero', () => {
    const cost = estimateCostUsd({
      pricing,
      promptTokens: 1_000_000,
      completionTokens: null,
    });
    expect(cost).toBeCloseTo(5, 6);
  });

  it('handles tiny costs without losing precision', () => {
    const cost = estimateCostUsd({
      pricing,
      promptTokens: 100,
      completionTokens: 50,
    });
    // 100 * 5 / 1e6 + 50 * 15 / 1e6 = 5e-4 + 7.5e-4 = 1.25e-3
    expect(cost).toBeCloseTo(0.00125, 10);
  });
});

describe('formatCostUsd', () => {
  it('renders em dash for nullish or non-finite values', () => {
    expect(formatCostUsd(null)).toBe('—');
    expect(formatCostUsd(undefined)).toBe('—');
    expect(formatCostUsd(Number.NaN)).toBe('—');
    expect(formatCostUsd(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('renders $0 exactly when cost is zero', () => {
    expect(formatCostUsd(0)).toBe('$0');
  });

  it('uses two decimals for >= $1', () => {
    expect(formatCostUsd(1.2345)).toBe('$1.23');
    expect(formatCostUsd(99.999)).toBe('$100.00');
  });

  it('uses three decimals for >= $0.01', () => {
    expect(formatCostUsd(0.12345)).toBe('$0.123');
  });

  it('uses five decimals for >= $0.0001', () => {
    expect(formatCostUsd(0.00123)).toBe('$0.00123');
  });

  it('uses exponential for tiny costs', () => {
    expect(formatCostUsd(0.0000005)).toBe('$5.00e-7');
  });
});
