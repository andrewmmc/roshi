import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/history-store';

export function useHistory() {
  const store = useHistoryStore();

  useEffect(() => {
    if (!store.loaded) {
      store.load();
    }
  }, [store.loaded, store.load]);

  return store;
}
