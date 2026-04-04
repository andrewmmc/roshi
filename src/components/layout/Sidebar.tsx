import { useState, useCallback } from 'react';
import { FilePlus2, Sun, Moon } from 'lucide-react';
import { emit } from '@tauri-apps/api/event';
import { IconButton } from '@/components/ui/icon-button';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { ProviderManager } from '@/components/providers/ProviderManager';
import { HistoryList } from '@/components/history/HistoryList';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useThemeStore } from '@/stores/theme-store';

export function Sidebar() {
  const resetComposer = useComposerStore((s) => s.resetComposer);
  const resetResponse = useResponseStore((s) => s.resetResponse);
  const hasUnsavedChanges = useComposerStore(selectHasUnsavedChanges);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [showDiscard, setShowDiscard] = useState(false);

  const reset = useCallback(() => {
    resetComposer();
    resetResponse();
  }, [resetComposer, resetResponse]);

  const handleNewRequest = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscard(true);
    } else {
      reset();
    }
  }, [hasUnsavedChanges, reset]);

  return (
    <div className="bg-sidebar flex h-full flex-col">
      <div className="border-sidebar-border/70 flex h-11 shrink-0 items-center justify-between border-b px-3">
        <button
          className="text-foreground/80 hover:text-foreground cursor-pointer text-[13px] font-medium tracking-tight transition-colors"
          onClick={() => emit('show-about')}
          title="About Roshi"
        >
          Roshi
        </button>
        <div className="flex items-center gap-0.5">
          <IconButton
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={toggleTheme}
            tooltip={
              theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
          >
            {theme === 'light' ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </IconButton>
          <ProviderManager />
          <IconButton
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={handleNewRequest}
            tooltip="New request"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-hidden">
        <HistoryList />
      </nav>

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={reset}
      />
    </div>
  );
}
