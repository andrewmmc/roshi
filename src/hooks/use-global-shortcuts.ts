import { useEffect } from 'react';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useUiStore } from '@/stores/ui-store';
import { useThemeStore } from '@/stores/theme-store';
import { useSendRequest } from '@/hooks/use-send-request';

function isDialogOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"][data-open]'));
}

export function useGlobalShortcuts() {
  const { send, cancel } = useSendRequest();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+Enter — send request
      if (mod && e.key === 'Enter') {
        const { isLoading } = useResponseStore.getState();
        const { providers } = useProviderStore.getState();
        if (!isLoading && providers.length > 0) {
          e.preventDefault();
          send();
        }
        return;
      }

      // Escape — cancel running request (only when no dialog is open)
      if (e.key === 'Escape' && !isDialogOpen()) {
        const { isLoading } = useResponseStore.getState();
        if (isLoading) {
          e.preventDefault();
          cancel();
        }
        return;
      }

      // Cmd/Ctrl+Shift+N — new request
      if (mod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        const hasUnsaved = selectHasUnsavedChanges(useComposerStore.getState());
        if (!hasUnsaved) {
          useComposerStore.getState().resetComposer();
          useResponseStore.getState().resetResponse();
        }
        // If there are unsaved changes, we can't open the discard dialog from here —
        // the user must click the New Request button. We simply do nothing so the
        // shortcut is a no-op rather than silently discarding data.
        return;
      }

      // Cmd/Ctrl+P — focus history search
      if (mod && !e.shiftKey && !e.altKey && e.key === 'p') {
        e.preventDefault();
        useUiStore.getState().focusHistorySearch();
        return;
      }

      // Cmd/Ctrl+Shift+, — open provider settings
      if (mod && e.shiftKey && e.key === ',') {
        e.preventDefault();
        useUiStore.getState().setProviderSettingsOpen(true);
        return;
      }

      // Alt/Opt+T — toggle theme
      // Use e.code (physical key) because on Mac, ⌥+letter produces a special
      // character (e.g. ⌥T → '†'), so e.key !== 't'.
      if (e.altKey && !mod && e.code === 'KeyT') {
        e.preventDefault();
        useThemeStore.getState().toggle();
        return;
      }

      // Alt/Opt+C — copy response to clipboard
      if (e.altKey && !mod && e.code === 'KeyC') {
        e.preventDefault();
        const { response, streamingContent } = useResponseStore.getState();
        const text = response?.content || streamingContent;
        if (text) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [send, cancel]);
}
