import type { ModelPricing } from '@/types/provider';

export interface CostEstimateInput {
  pricing: ModelPricing | undefined | null;
  promptTokens: number | null | undefined;
  completionTokens: number | null | undefined;
}

/**
 * Estimate the USD cost of a single call given per-million-token pricing.
 * Returns null when pricing or token counts are missing.
 */
export function estimateCostUsd({
  pricing,
  promptTokens,
  completionTokens,
}: CostEstimateInput): number | null {
  if (!pricing) return null;
  if (
    typeof promptTokens !== 'number' &&
    typeof completionTokens !== 'number'
  ) {
    return null;
  }
  const prompt = typeof promptTokens === 'number' ? promptTokens : 0;
  const completion =
    typeof completionTokens === 'number' ? completionTokens : 0;
  const cost =
    (prompt / 1_000_000) * pricing.inputPerMTokens +
    (completion / 1_000_000) * pricing.outputPerMTokens;

  if (!Number.isFinite(cost)) return null;
  return cost;
}

/**
 * Format a USD cost as a short string. Returns "—" for null/undefined.
 * Picks digit precision based on magnitude so sub-cent amounts stay legible.
 */
export function formatCostUsd(cost: number | null | undefined): string {
  if (cost === null || cost === undefined || !Number.isFinite(cost)) {
    return '—';
  }
  if (cost === 0) return '$0';

  const abs = Math.abs(cost);
  if (abs >= 1) return `$${cost.toFixed(2)}`;
  if (abs >= 0.01) return `$${cost.toFixed(3)}`;
  if (abs >= 0.0001) return `$${cost.toFixed(5)}`;
  return `$${cost.toExponential(2)}`;
}
