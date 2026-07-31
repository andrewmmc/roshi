import { useEffect } from 'react';
import { useComposerStore } from '@/stores/composer-store';
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
    let unsubscribeComposer: (() => void) | undefined;

    void hydrate().then(() => {
      if (disposed) return;
      unsubscribeComposer = useComposerStore.subscribe(() => {
        scheduleRequestSessionPersistence();
      });
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
      unsubscribeComposer?.();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flush();
    };
  }, [hydrate]);
}
