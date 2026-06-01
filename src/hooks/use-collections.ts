import { useEffect } from 'react';
import { useCollectionStore } from '@/stores/collection-store';

export function useCollections() {
  const store = useCollectionStore();
  const { loaded, load } = store;

  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded, load]);

  return store;
}
