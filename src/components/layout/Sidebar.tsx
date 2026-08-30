import { useState, useCallback } from 'react';
import { FilePlus2, PanelLeftClose, Keyboard } from 'lucide-react';
import {
  useUiStore,
  type MainView,
  type SidebarSection,
} from '@/stores/ui-store';
import { IconButton } from '@/components/ui/icon-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KbdShortcut } from '@/components/ui/tooltip';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { SettingsDialog } from '@/components/settings';
import { HistoryList } from '@/components/history/HistoryList';
import { CollectionsList } from '@/components/collections/CollectionsList';
import { EvalRunsList } from '@/components/eval/EvalRunsList';
import {
  activeWorkspaceHasUnsavedChanges,
  getDiscardDialogCopy,
  resetActiveWorkspace,
} from '@/utils/new-request';
import { useTranslation } from '@/i18n';

function SidebarSectionTabs() {
  const { t } = useTranslation();
  const mainView = useUiStore((s) => s.mainView);

  return (
    <TabsList
      variant="line"
      className="h-7 shrink-0 justify-start gap-0 rounded-none px-0"
    >
      {mainView === 'request' ? (
        <>
          <TabsTrigger
            value="history"
            className="px-3 text-xs after:bottom-[-5px]"
          >
            {t('navigation.history')}
          </TabsTrigger>
          <TabsTrigger
            value="collections"
            className="px-3 text-xs after:bottom-[-5px]"
          >
            {t('navigation.collections')}
          </TabsTrigger>
        </>
      ) : (
        <TabsTrigger value="evals" className="px-3 text-xs after:bottom-[-5px]">
          {t('navigation.collections')}
        </TabsTrigger>
      )}
    </TabsList>
  );
}

function getActiveSidebarSection(
  mainView: MainView,
  sidebarSection: SidebarSection,
): SidebarSection {
  if (mainView === 'eval') {
    return 'evals';
  }

  return sidebarSection === 'collections' ? 'collections' : 'history';
}

export function Sidebar() {
  const { t } = useTranslation();
  const setAboutOpen = useUiStore((s) => s.setAboutOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const mainView = useUiStore((s) => s.mainView);
  const sidebarSection = useUiStore((s) => s.sidebarSection);
  const setSidebarSection = useUiStore((s) => s.setSidebarSection);
  const [showDiscard, setShowDiscard] = useState(false);
  const activeSidebarSection = getActiveSidebarSection(
    mainView,
    sidebarSection,
  );
  const discardDialogCopy = getDiscardDialogCopy(mainView);

  const reset = useCallback(() => {
    resetActiveWorkspace();
  }, []);

  const handleNewRequest = useCallback(() => {
    if (activeWorkspaceHasUnsavedChanges()) {
      setShowDiscard(true);
    } else {
      reset();
    }
  }, [reset]);

  return (
    <div className="bg-sidebar flex h-full flex-col">
      <Tabs
        value={activeSidebarSection}
        onValueChange={(value) =>
          setSidebarSection(value as typeof sidebarSection)
        }
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <div className="border-sidebar-border/70 flex h-11 shrink-0 items-center gap-1 border-b px-3">
          <button
            className="text-foreground/80 hover:text-foreground inline-flex h-7 shrink-0 items-center rounded-none px-3 text-[13px] font-medium tracking-tight whitespace-nowrap transition-colors"
            onClick={() => setAboutOpen(true)}
            title={t('about.title')}
          >
            Roshi
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            <IconButton
              variant="ghost"
              size="icon-sm"
              aria-label={t('navigation.collapseSidebar')}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarCollapsed(true)}
              tooltip={t('navigation.collapseSidebar')}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </IconButton>
            <SettingsDialog />
            <IconButton
              variant="ghost"
              size="icon-sm"
              aria-label={t('navigation.keyboardShortcuts')}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShortcutsOpen(true)}
              tooltip={
                <span className="flex items-center gap-1.5">
                  {t('navigation.keyboardShortcuts')}
                  <KbdShortcut mac="?" win="?" />
                </span>
              }
            >
              <Keyboard className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="icon-sm"
              aria-label={t('navigation.newRequest')}
              className="text-muted-foreground hover:text-foreground"
              onClick={handleNewRequest}
              tooltip={
                <span className="flex items-center gap-1.5">
                  {t('navigation.newRequest')}
                  <KbdShortcut mac="⌘⇧N" win="Ctrl+Shift+N" />
                </span>
              }
            >
              <FilePlus2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
        <nav
          aria-label={t('navigation.mainNavigation')}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {mainView === 'request' ? (
            <>
              <TabsContent
                value="history"
                className="min-h-0 flex-1 overflow-hidden"
              >
                <HistoryList headerSlot={<SidebarSectionTabs />} />
              </TabsContent>
              <TabsContent
                value="collections"
                className="min-h-0 flex-1 overflow-hidden"
              >
                <CollectionsList headerSlot={<SidebarSectionTabs />} />
              </TabsContent>
            </>
          ) : (
            <TabsContent
              value="evals"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <EvalRunsList headerSlot={<SidebarSectionTabs />} />
            </TabsContent>
          )}
        </nav>
      </Tabs>

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={reset}
        title={t(discardDialogCopy.titleKey)}
        description={t(discardDialogCopy.descriptionKey)}
      />
    </div>
  );
}
