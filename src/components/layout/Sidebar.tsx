import { useState, useCallback } from 'react';
import { FilePlus2, Sun, Moon } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { IconButton } from '@/components/ui/icon-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KbdShortcut } from '@/components/ui/tooltip';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { ProviderManager } from '@/components/providers/ProviderManager';
import { HistoryList } from '@/components/history/HistoryList';
import { CollectionsList } from '@/components/collections/CollectionsList';
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
  const setAboutOpen = useUiStore((s) => s.setAboutOpen);
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
          onClick={() => setAboutOpen(true)}
          title="About Roshi"
        >
          Roshi
        </button>
        <div className="flex items-center gap-0.5">
          <IconButton
            variant="ghost"
            size="icon"
            aria-label={
              theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={toggleTheme}
            tooltip={
              <span className="flex items-center gap-1.5">
                {theme === 'light'
                  ? 'Switch to dark mode'
                  : 'Switch to light mode'}
                <KbdShortcut mac="⌥T" win="Alt+T" />
              </span>
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
            aria-label="New request"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={handleNewRequest}
            tooltip={
              <span className="flex items-center gap-1.5">
                New request
                <KbdShortcut mac="⌘⇧N" win="Ctrl+Shift+N" />
              </span>
            }
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-hidden">
        <Tabs defaultValue="history" className="flex h-full flex-col gap-0">
          <TabsList
            variant="line"
            className="border-sidebar-border/70 h-9 shrink-0 justify-start rounded-none border-b px-2"
          >
            <TabsTrigger value="history" className="px-3 text-xs">
              History
            </TabsTrigger>
            <TabsTrigger value="collections" className="px-3 text-xs">
              Collections
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="history"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <HistoryList />
          </TabsContent>
          <TabsContent
            value="collections"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <CollectionsList />
          </TabsContent>
        </Tabs>
      </nav>

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={reset}
      />
    </div>
  );
}
