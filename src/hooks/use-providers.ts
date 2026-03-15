import { useEffect } from 'react';
import { useProviderStore } from '@/stores/provider-store';

export function useProviders() {
  const store = useProviderStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded, load]);

  return store;
}
