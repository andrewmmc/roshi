import { create } from 'zustand';
import {
  buildPricingLookupKeys,
  calculateUsageCostUsd,
  FALLBACK_PRICING,
  LITELLM_PRICING_URL,
  parseLiteLlmPricingPayload,
  type ProviderPricingContext,
  type TokenPricing,
  type UsageLike,
} from '@/lib/token-pricing';

interface PricingStore {
  pricingByModel: Record<string, TokenPricing>;
  loaded: boolean;
  loading: boolean;
  loadError: string | null;
  loadPricing: () => Promise<void>;
  getModelPricing: (provider: ProviderPricingContext, modelId: string) => TokenPricing | null;
  estimateUsageCostUsd: (provider: ProviderPricingContext, modelId: string, usage: UsageLike) => number | null;
}

export const usePricingStore = create<PricingStore>((set, get) => ({
  pricingByModel: FALLBACK_PRICING,
  loaded: false,
  loading: false,
  loadError: null,

  loadPricing: async () => {
    if (get().loaded || get().loading) {
      return;
    }

    set({ loading: true, loadError: null });

    try {
      const response = await fetch(LITELLM_PRICING_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch pricing table (HTTP ${response.status})`);
      }

      const payload = (await response.json()) as unknown;
      const remotePricing = parseLiteLlmPricingPayload(payload);

      set((state) => ({
        pricingByModel: {
          ...state.pricingByModel,
          ...remotePricing,
        },
        loaded: true,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pricing fetch error';
      set({
        loaded: true,
        loading: false,
        loadError: message,
      });
    }
  },

  getModelPricing: (provider, modelId) => {
    const { pricingByModel } = get();
    const lookupKeys = buildPricingLookupKeys(provider, modelId);

    for (const key of lookupKeys) {
      const match = pricingByModel[key];
      if (match) {
        return match;
      }
    }

    return null;
  },

  estimateUsageCostUsd: (provider, modelId, usage) => {
    const pricing = get().getModelPricing(provider, modelId);
    if (!pricing) {
      return null;
    }
    return calculateUsageCostUsd(usage, pricing);
  },
}));
