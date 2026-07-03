import { useEffect } from 'react';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { useEvalStore } from '@/stores/eval-store';
import { useThemeStore } from '@/stores/theme-store';
import { toast } from '@/stores/toast-store';
import { useSendRequest } from '@/hooks/use-send-request';
import {
  activeWorkspaceHasUnsavedChanges,
  getActiveResponseText,
  resetActiveWorkspace,
} from '@/utils/new-request';

function isDialogOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"][data-open]'));
}

export function useGlobalShortcuts() {
  const { send, cancel } = useSendRequest();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const isEval = useUiStore.getState().mainView === 'eval';

      // Cmd/Ctrl+Enter — send request / run eval
      if (mod && e.key === 'Enter') {
        if (isEval) {
          const { isRunning, runners } = useEvalStore.getState();
          if (!isRunning && runners.length > 0) {
            e.preventDefault();
            useEvalStore.getState().start();
          }
          return;
        }
        const { isLoading } = useResponseStore.getState();
        const { providers } = useProviderStore.getState();
        if (!isLoading && providers.length > 0) {
          e.preventDefault();
          send();
        }
        return;
      }

      // Escape — cancel running request/eval (only when no dialog is open)
      if (e.key === 'Escape' && !isDialogOpen()) {
        if (isEval) {
          const { isRunning } = useEvalStore.getState();
          if (isRunning) {
            e.preventDefault();
            useEvalStore.getState().cancelAll();
          }
          return;
        }
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
        if (!activeWorkspaceHasUnsavedChanges()) {
          resetActiveWorkspace();
        } else {
          // Open the global discard-confirmation dialog (rendered by CommandPalette).
          useUiStore.getState().setNewRequestDiscardOpen(true);
        }
        return;
      }

      // ? — open shortcuts cheat-sheet (only when not typing in an input)
      if (e.key === '?' && !mod) {
        const active = document.activeElement as HTMLElement | null;
        const isInput =
          active?.tagName === 'INPUT' ||
          active?.tagName === 'TEXTAREA' ||
          active?.isContentEditable;
        if (!isInput && !isDialogOpen()) {
          e.preventDefault();
          useUiStore.getState().setShortcutsOpen(true);
          return;
        }
      }

      // Cmd/Ctrl+P — focus history search (request mode only; the eval
      // sidebar has no history search). We still preventDefault in both modes
      // so the app consistently owns this shortcut instead of the browser's
      // print dialog.
      if (mod && !e.shiftKey && !e.altKey && e.key === 'p') {
        e.preventDefault();
        if (!isEval) {
          useUiStore.getState().focusHistorySearch();
        }
        return;
      }

      // Cmd/Ctrl+Shift+, — open settings
      if (mod && e.shiftKey && e.key === ',') {
        e.preventDefault();
        useUiStore.getState().setSettingsOpen(true, 'general');
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

      // Alt/Opt+C — copy response to clipboard (request response or eval
      // runner result(s), depending on the active workspace)
      if (e.altKey && !mod && e.code === 'KeyC') {
        e.preventDefault();
        const text = getActiveResponseText();
        if (text) {
          navigator.clipboard
            .writeText(text)
            .then(() => toast('Copied to clipboard'))
            .catch(() => {});
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [send, cancel]);
}
