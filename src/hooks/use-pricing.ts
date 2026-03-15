import { useEffect } from 'react';
import { usePricingStore } from '@/stores/pricing-store';

export function usePricing() {
  const store = usePricingStore();
  const loaded = usePricingStore((s) => s.loaded);
  const loading = usePricingStore((s) => s.loading);
  const loadPricing = usePricingStore((s) => s.loadPricing);

  useEffect(() => {
    if (!loaded && !loading) {
      void loadPricing();
    }
  }, [loaded, loading, loadPricing]);

  return store;
}
