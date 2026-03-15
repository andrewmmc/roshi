import type { NormalizedResponse } from '@/types/normalized';

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const PRICING_BY_MODEL: Record<string, ModelPricing> = {
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4.1': { inputPer1M: 2, outputPer1M: 8 },
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6 },
  'gpt-4.1-nano': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'o3-mini': { inputPer1M: 1.1, outputPer1M: 4.4 },
  'claude-opus-4-0-20250514': { inputPer1M: 15, outputPer1M: 75 },
  'claude-sonnet-4-20250514': { inputPer1M: 3, outputPer1M: 15 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.8, outputPer1M: 4 },
  'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 10 },
  'gemini-2.5-flash': { inputPer1M: 0.3, outputPer1M: 2.5 },
  'gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
};

function normalizeModelId(modelId: string): string {
  if (PRICING_BY_MODEL[modelId]) {
    return modelId;
  }
  const lower = modelId.toLowerCase();
  if (PRICING_BY_MODEL[lower]) {
    return lower;
  }
  const split = lower.split('/');
  return split.length > 1 ? split[split.length - 1] : lower;
}

export function estimateCostUsd(
  modelId: string,
  usage: NormalizedResponse['usage'],
): number | null {
  if (!usage) return null;
  const pricing = PRICING_BY_MODEL[normalizeModelId(modelId)];
  if (!pricing) return null;

  const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

export function formatUsd(amount: number | null): string {
  if (amount === null) return 'N/A';
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(5)}`;
  return `$${amount.toFixed(3)}`;
}
