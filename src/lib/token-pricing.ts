import type { ProviderConfig } from '@/types/provider';

export const LITELLM_PRICING_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

export interface TokenPricing {
  inputCostPerToken: number;
  outputCostPerToken: number;
  source: 'live' | 'fallback';
}

export interface UsageLike {
  promptTokens: number;
  completionTokens: number;
}

export type ProviderPricingContext = Pick<ProviderConfig, 'type' | 'name' | 'baseUrl'> | null;

const fallbackPricingData: Record<
  string,
  {
    inputCostPerToken: number;
    outputCostPerToken: number;
  }
> = {
  'gpt-4o': { inputCostPerToken: 0.0000025, outputCostPerToken: 0.00001 },
  'gpt-4o-mini': { inputCostPerToken: 0.00000015, outputCostPerToken: 0.0000006 },
  'gpt-4.1': { inputCostPerToken: 0.000002, outputCostPerToken: 0.000008 },
  'gpt-4.1-mini': { inputCostPerToken: 0.0000004, outputCostPerToken: 0.0000016 },
  'gpt-4.1-nano': { inputCostPerToken: 0.0000001, outputCostPerToken: 0.0000004 },
  'o3-mini': { inputCostPerToken: 0.0000011, outputCostPerToken: 0.0000044 },
  'claude-opus-4-20250514': { inputCostPerToken: 0.000015, outputCostPerToken: 0.000075 },
  'claude-sonnet-4-20250514': { inputCostPerToken: 0.000003, outputCostPerToken: 0.000015 },
  'gemini-2.5-pro': { inputCostPerToken: 0.00000125, outputCostPerToken: 0.00001 },
  'gemini-2.5-flash': { inputCostPerToken: 0.0000003, outputCostPerToken: 0.0000025 },
  'gemini-2.0-flash': { inputCostPerToken: 0.0000001, outputCostPerToken: 0.0000004 },
  'openrouter/openai/gpt-4o': { inputCostPerToken: 0.0000025, outputCostPerToken: 0.00001 },
  'openrouter/anthropic/claude-sonnet-4': { inputCostPerToken: 0.000003, outputCostPerToken: 0.000015 },
  'openrouter/google/gemini-2.5-pro': { inputCostPerToken: 0.00000125, outputCostPerToken: 0.00001 },
};

export const FALLBACK_PRICING: Record<string, TokenPricing> = Object.fromEntries(
  Object.entries(fallbackPricingData).map(([key, value]) => [
    key,
    { ...value, source: 'fallback' as const },
  ]),
);

function toModelKey(value: string): string {
  return value.trim().toLowerCase();
}

function isOpenRouterProvider(provider: ProviderPricingContext): boolean {
  if (!provider) return false;
  const name = provider.name.toLowerCase();
  const baseUrl = provider.baseUrl.toLowerCase();
  return name.includes('openrouter') || baseUrl.includes('openrouter.ai');
}

export function buildPricingLookupKeys(
  provider: ProviderPricingContext,
  modelId: string,
): string[] {
  const key = toModelKey(modelId);
  const keys = new Set<string>([key]);

  // Anthropic model aliases sometimes include an extra "-0-" segment.
  keys.add(key.replace(/-0-(\d{8})$/, '-$1'));

  if (isOpenRouterProvider(provider)) {
    keys.add(`openrouter/${key}`);
  }

  if (key.startsWith('openrouter/')) {
    keys.add(key.replace(/^openrouter\//, ''));
  }

  if (key.includes('/')) {
    const pieces = key.split('/');
    const lastPiece = pieces[pieces.length - 1];
    if (lastPiece) {
      keys.add(lastPiece);
    }
  }

  return Array.from(keys);
}

export function parseLiteLlmPricingPayload(payload: unknown): Record<string, TokenPricing> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const result: Record<string, TokenPricing> = {};

  for (const [rawKey, rawValue] of Object.entries(payload)) {
    if (!rawValue || typeof rawValue !== 'object') {
      continue;
    }

    const value = rawValue as {
      mode?: string;
      input_cost_per_token?: number;
      output_cost_per_token?: number;
    };

    if (value.mode && value.mode !== 'chat') {
      continue;
    }

    const input = Number(value.input_cost_per_token);
    const output = Number(value.output_cost_per_token);
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      continue;
    }

    result[toModelKey(rawKey)] = {
      inputCostPerToken: input,
      outputCostPerToken: output,
      source: 'live',
    };
  }

  return result;
}

export function calculateUsageCostUsd(usage: UsageLike, pricing: TokenPricing): number {
  return usage.promptTokens * pricing.inputCostPerToken + usage.completionTokens * pricing.outputCostPerToken;
}

export function formatUsd(cost: number): string {
  return `$${cost.toFixed(4)}`;
}
