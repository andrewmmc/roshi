import { useEffect } from 'react';
import { useEnvironmentStore } from '@/stores/environment-store';

export function useEnvironments() {
  const store = useEnvironmentStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded, load]);

  return store;
}
