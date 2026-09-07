import { useEffect } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { useEnvironmentStore } from '@/stores/environment-store';
import {
  persistRequestSessionNow,
  scheduleRequestSessionPersistence,
  useTabStore,
} from '@/stores/tab-store';

/**
 * Restore the previous request workspace and persist composer edits in the
 * background. Responses remain in History; this session only stores drafts and
 * open-tab composer state.
 */
export function useRequestSession() {
  const hydrate = useTabStore((state) => state.hydrate);

  useEffect(() => {
    let disposed = false;
    const unsubscribers: Array<() => void> = [];

    void hydrate().then(() => {
      if (disposed) return;
      unsubscribers.push(
        useComposerStore.subscribe(scheduleRequestSessionPersistence),
        useProviderStore.subscribe((state, previous) => {
          if (
            state.selectedProviderId !== previous.selectedProviderId ||
            state.selectedModelId !== previous.selectedModelId
          ) {
            scheduleRequestSessionPersistence();
          }
        }),
        useEnvironmentStore.subscribe((state, previous) => {
          if (state.selectedEnvironmentId !== previous.selectedEnvironmentId) {
            scheduleRequestSessionPersistence();
          }
        }),
      );
    });

    const flush = () => {
      void persistRequestSessionNow();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flush();
    };
  }, [hydrate]);
}
