import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { KbdShortcut } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { MAX_TABS, useTabStore } from '@/stores/tab-store';
import { useProviderStore } from '@/stores/provider-store';
import { useThemeStore } from '@/stores/theme-store';
import { useResponseStore } from '@/stores/response-store';
import { useEvalStore } from '@/stores/eval-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { toast } from '@/stores/toast-store';
import { useTranslation } from '@/i18n';
import {
  activeWorkspaceHasUnsavedChanges,
  getActiveResponseText,
  getDiscardDialogCopy,
  requestCloseActiveTab,
  resetActiveWorkspace,
} from '@/utils/new-request';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  group: string;
  keywords?: string[];
  shortcut?: { mac: string; win: string };
  disabledReason?: string;
  action: () => void;
}

function findNextEnabledIndex(
  commands: Command[],
  fromIndex: number,
  direction: 1 | -1,
): number {
  for (let step = 1; step <= commands.length; step++) {
    const index =
      (fromIndex + direction * step + commands.length) % commands.length;
    if (!commands[index]?.disabledReason) return index;
  }
  return fromIndex;
}

// ---------------------------------------------------------------------------
// Inner content component — remounted on each palette open via `key` so that
// query and selectedIndex start fresh without needing setState-in-effect.
// ---------------------------------------------------------------------------

function PaletteContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const { send, cancel } = useSendRequest();
  const providers = useProviderStore((s) => s.providers);
  const selectedProviderId = useProviderStore((s) => s.selectedProviderId);
  const selectedModelId = useProviderStore((s) => s.selectedModelId);
  const mainView = useUiStore((s) => s.mainView);
  const tabs = useTabStore((s) => s.tabs);
  const isLoading = useResponseStore((s) => s.isLoading);
  const response = useResponseStore((s) => s.response);
  const streamingContent = useResponseStore((s) => s.streamingContent);
  const isEvalRunning = useEvalStore((s) => s.isRunning);
  const isEvalJudging = useEvalStore((s) => s.isJudging);
  const isEvalBusy = isEvalRunning || isEvalJudging;
  const runners = useEvalStore((s) => s.runners);
  const evalResults = useEvalStore((s) => s.results);
  const isEval = mainView === 'eval';
  const selectedProvider = providers.find(
    (provider) => provider.id === selectedProviderId,
  );
  const selectedModel = selectedProvider?.models.find(
    (model) => model.id === selectedModelId,
  );
  const sendDisabledReason = isEval
    ? isEvalBusy
      ? t('navigation.cmdEvalRunning')
      : runners.length === 0
        ? t('navigation.cmdNeedRunner')
        : undefined
    : isLoading
      ? t('navigation.cmdRequestRunning')
      : !selectedProvider
        ? t('request.selectAProvider')
        : !selectedModel
          ? t('request.selectAModel')
          : !selectedProvider.apiKey.trim()
            ? t('request.addApiKey')
            : undefined;
  const cancelDisabledReason = isEval
    ? isEvalBusy
      ? undefined
      : t('navigation.cmdNoEvalRunning')
    : isLoading
      ? undefined
      : t('navigation.cmdNoRequestRunning');
  const activeResponseText = isEval
    ? runners
        .map((runner) => evalResults[runner.id]?.content?.trim() ?? '')
        .filter(Boolean)
        .join('\n\n')
    : response?.content || streamingContent;
  const tabLimitReason =
    tabs.length >= MAX_TABS
      ? t('navigation.cmdTabLimit', { count: MAX_TABS })
      : undefined;
  const tabBusyReason = isLoading ? t('navigation.cmdTabBusy') : undefined;

  // Build the full command list. Dynamic provider/model entries are derived
  // from store state at memo time; actions read live state via getState().
  const allCommands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      {
        id: 'send',
        label: isEval
          ? t('navigation.cmdRunEval')
          : t('navigation.cmdSendRequest'),
        group: t('navigation.groupActions'),
        keywords: ['run', 'execute', 'submit', 'prompt'],
        shortcut: { mac: '⌘↵', win: 'Ctrl+↵' },
        disabledReason: sendDisabledReason,
        action: () => {
          if (isEval) {
            const { isRunning, isJudging, runners } = useEvalStore.getState();
            if (!isRunning && !isJudging && runners.length > 0) {
              void useEvalStore.getState().start();
            }
            return;
          }
          const { isLoading } = useResponseStore.getState();
          const { providers: ps } = useProviderStore.getState();
          if (!isLoading && ps.length > 0) send();
        },
      },
      {
        id: 'cancel',
        label: isEval
          ? t('navigation.cmdStopEval')
          : t('navigation.cmdStopRequest'),
        group: t('navigation.groupActions'),
        keywords: ['cancel', 'abort', 'interrupt'],
        shortcut: { mac: 'Esc', win: 'Esc' },
        disabledReason: cancelDisabledReason,
        action: () => {
          if (isEval) {
            const { isRunning, isJudging } = useEvalStore.getState();
            if (isRunning || isJudging) useEvalStore.getState().cancelAll();
            return;
          }
          const { isLoading } = useResponseStore.getState();
          if (isLoading) cancel();
        },
      },
      {
        id: 'new-request',
        label: isEval
          ? t('navigation.cmdNewEval')
          : t('navigation.cmdNewRequest'),
        group: t('navigation.groupActions'),
        keywords: ['clear', 'reset', 'fresh'],
        shortcut: { mac: '⌘⇧N', win: 'Ctrl+Shift+N' },
        disabledReason:
          isEvalBusy || isLoading ? t('navigation.cmdTaskBusy') : undefined,
        action: () => {
          if (activeWorkspaceHasUnsavedChanges()) {
            useUiStore.getState().setNewRequestDiscardOpen(true);
          } else {
            resetActiveWorkspace();
          }
        },
      },
      // Tabs only exist in request mode.
      ...(isEval
        ? []
        : [
            {
              id: 'new-tab',
              label: t('navigation.cmdNewTab'),
              group: t('navigation.groupActions'),
              keywords: ['create', 'request', 'workspace'],
              shortcut: { mac: '⌘T', win: 'Ctrl+T' },
              disabledReason: tabBusyReason ?? tabLimitReason,
              action: () => useTabStore.getState().createTab(),
            },
            {
              id: 'duplicate-tab',
              label: t('navigation.cmdDuplicateTab'),
              group: t('navigation.groupActions'),
              keywords: ['copy', 'clone', 'request'],
              shortcut: { mac: '⌘⇧D', win: 'Ctrl+Shift+D' },
              disabledReason: tabBusyReason ?? tabLimitReason,
              action: () => useTabStore.getState().duplicateActiveTab(),
            },
            {
              id: 'close-tab',
              label: t('navigation.cmdCloseTab'),
              group: t('navigation.groupActions'),
              keywords: ['remove', 'dismiss', 'request'],
              shortcut: { mac: '⌘W', win: 'Ctrl+W' },
              disabledReason:
                tabBusyReason ??
                (tabs.length <= 1 ? t('navigation.cmdMinOneTab') : undefined),
              action: requestCloseActiveTab,
            },
          ]),
      {
        id: 'toggle-theme',
        label: t('navigation.cmdToggleTheme'),
        group: t('navigation.groupActions'),
        keywords: ['dark', 'light', 'appearance', 'color'],
        shortcut: { mac: '⌥T', win: 'Alt+T' },
        action: () => useThemeStore.getState().toggle(),
      },
      {
        id: 'copy-response',
        label: isEval
          ? t('navigation.cmdCopyResults')
          : t('navigation.cmdCopyResponse'),
        group: t('navigation.groupActions'),
        keywords: ['clipboard', 'output', 'result'],
        shortcut: { mac: '⌥C', win: 'Alt+C' },
        disabledReason: activeResponseText
          ? undefined
          : t('navigation.cmdNoResponseToCopy'),
        action: () => {
          const text = activeResponseText || getActiveResponseText();
          if (text) {
            navigator.clipboard
              .writeText(text)
              .then(() => toast(t('common.copiedToClipboard')))
              .catch(() => {});
          }
        },
      },
      // History search only exists in request mode.
      ...(isEval
        ? []
        : [
            {
              id: 'focus-history',
              label: t('navigation.cmdSearchHistory'),
              group: t('navigation.groupNavigation'),
              keywords: ['find', 'requests', 'recent'],
              shortcut: { mac: '⌘P', win: 'Ctrl+P' },
              action: () => useUiStore.getState().focusHistorySearch(),
            },
          ]),
      {
        id: 'settings-general',
        label: t('navigation.cmdSettingsGeneral'),
        group: t('navigation.groupNavigation'),
        keywords: ['preferences', 'theme', 'reset'],
        shortcut: { mac: '⌘⇧,', win: 'Ctrl+Shift+,' },
        action: () => useUiStore.getState().setSettingsOpen(true, 'general'),
      },
      {
        id: 'settings-providers',
        label: t('navigation.cmdSettingsProviders'),
        group: t('navigation.groupNavigation'),
        keywords: ['api key', 'credentials', 'endpoint', 'connection'],
        action: () => useUiStore.getState().setSettingsOpen(true, 'providers'),
      },
      {
        id: 'settings-environments',
        label: t('navigation.cmdSettingsEnvironments'),
        group: t('navigation.groupNavigation'),
        keywords: ['variables', 'secrets', 'template'],
        action: () =>
          useUiStore.getState().setSettingsOpen(true, 'environments'),
      },
      {
        id: 'settings-models',
        label: t('navigation.cmdSettingsModels'),
        group: t('navigation.groupNavigation'),
        keywords: ['catalog', 'market', 'add model'],
        action: () => useUiStore.getState().openModelMarket(),
      },
      {
        id: 'show-shortcuts',
        label: t('navigation.keyboardShortcuts'),
        group: t('navigation.groupNavigation'),
        keywords: ['keys', 'hotkeys', 'help'],
        shortcut: { mac: '?', win: '?' },
        action: () => useUiStore.getState().setShortcutsOpen(true),
      },
      {
        id: 'about',
        label: t('about.title'),
        group: t('navigation.groupNavigation'),
        keywords: ['version', 'info', 'help'],
        action: () => useUiStore.getState().setAboutOpen(true),
      },
    ];

    // Dynamic: one entry per provider.
    for (const p of providers) {
      cmds.push({
        id: `switch-provider-${p.id}`,
        label: t('navigation.cmdSwitchProvider', { name: p.name }),
        group: t('navigation.groupProviders'),
        keywords: ['provider', 'connection', 'api', p.name],
        action: () => useProviderStore.getState().selectProvider(p.id),
      });
    }

    // Dynamic: models for the currently selected provider.
    if (selectedProvider) {
      for (const m of selectedProvider.models) {
        cmds.push({
          id: `select-model-${m.id}`,
          label: t('navigation.cmdSelectModel', { name: m.displayName }),
          group: t('navigation.groupModels'),
          keywords: ['model', m.id, m.displayName],
          action: () => useProviderStore.getState().selectModel(m.id),
        });
      }
    }

    return cmds;
  }, [
    activeResponseText,
    cancel,
    cancelDisabledReason,
    isEval,
    isEvalBusy,
    isLoading,
    providers,
    selectedProvider,
    send,
    sendDisabledReason,
    tabBusyReason,
    tabLimitReason,
    tabs.length,
    t,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lq = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(lq) ||
        c.group.toLowerCase().includes(lq) ||
        c.keywords?.some((keyword) => keyword.toLowerCase().includes(lq)),
    );
  }, [allCommands, query]);

  // Group filtered commands for display while preserving flat indices for
  // keyboard navigation (selectedIndex is a flat index across all items).
  const displayGroups = useMemo(() => {
    type GroupEntry = {
      label: string;
      items: { cmd: Command; flatIdx: number }[];
    };
    const groups: GroupEntry[] = [];
    for (let i = 0; i < filteredCommands.length; i++) {
      const cmd = filteredCommands[i];
      const existing = groups.find((g) => g.label === cmd.group);
      if (existing) {
        existing.items.push({ cmd, flatIdx: i });
      } else {
        groups.push({ label: cmd.group, items: [{ cmd, flatIdx: i }] });
      }
    }
    return groups;
  }, [filteredCommands]);

  // Clamp selectedIndex inline so no useEffect + setState is needed.
  const clampedIndex =
    filteredCommands.length > 0
      ? Math.min(selectedIndex, filteredCommands.length - 1)
      : 0;
  const firstEnabledIndex = filteredCommands.findIndex(
    (command) => !command.disabledReason,
  );
  const effectiveIndex = filteredCommands[clampedIndex]?.disabledReason
    ? Math.max(firstEnabledIndex, 0)
    : clampedIndex;

  // Scroll the selected item into view on navigation (no setState, DOM only).
  useEffect(() => {
    itemRefs.current[effectiveIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [effectiveIndex]);

  const runAndClose = useCallback(
    (command: Command) => {
      if (command.disabledReason) return;
      command.action();
      onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const count = filteredCommands.length;
      if (count === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(
          findNextEnabledIndex(filteredCommands, effectiveIndex, 1),
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          findNextEnabledIndex(filteredCommands, effectiveIndex, -1),
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[effectiveIndex];
        if (cmd) runAndClose(cmd);
      }
    },
    [filteredCommands, effectiveIndex, runAndClose],
  );

  const activeOptionId = filteredCommands[effectiveIndex]
    ? `command-option-${filteredCommands[effectiveIndex].id}`
    : undefined;

  return (
    <>
      {/* Search input row */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <SearchIcon className="text-muted-foreground h-4 w-4 shrink-0" />
        <input
          autoFocus
          role="combobox"
          aria-label={t('navigation.searchCommandsAria')}
          aria-controls="command-palette-listbox"
          aria-expanded="true"
          aria-activedescendant={activeOptionId}
          className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          placeholder={t('navigation.searchCommands')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Command list */}
      <ScrollArea className="max-h-[340px]">
        {filteredCommands.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t('navigation.noCommands')}
          </p>
        ) : (
          <div role="listbox" id="command-palette-listbox" className="py-1">
            {displayGroups.map((group) => (
              <div key={group.label}>
                <p className="text-muted-foreground px-3 pt-2 pb-0.5 text-[11px] font-medium tracking-wide uppercase first:pt-1">
                  {group.label}
                </p>
                {group.items.map(({ cmd, flatIdx }) => (
                  <button
                    type="button"
                    key={cmd.id}
                    id={`command-option-${cmd.id}`}
                    ref={(el) => {
                      itemRefs.current[flatIdx] = el;
                    }}
                    role="option"
                    aria-selected={effectiveIndex === flatIdx}
                    aria-disabled={Boolean(cmd.disabledReason)}
                    disabled={Boolean(cmd.disabledReason)}
                    className={cn(
                      'mx-1 flex min-h-10 w-[calc(100%-0.5rem)] cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50',
                      effectiveIndex === flatIdx
                        ? 'bg-accent'
                        : 'hover:bg-accent/50 disabled:hover:bg-transparent',
                    )}
                    onClick={() => runAndClose(cmd)}
                    onMouseEnter={() => {
                      if (!cmd.disabledReason) setSelectedIndex(flatIdx);
                    }}
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate">{cmd.label}</span>
                      {cmd.disabledReason && (
                        <span className="text-muted-foreground block truncate text-[11px] leading-tight">
                          {cmd.disabledReason}
                        </span>
                      )}
                    </span>
                    {cmd.shortcut && (
                      <KbdShortcut
                        mac={cmd.shortcut.mac}
                        win={cmd.shortcut.win}
                        className="ml-auto shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public export — mounts the palette dialog and registers the ⌘K shortcut
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  // Each time the palette opens the store increments this counter. Passing it
  // as `key` to PaletteContent causes a clean remount (and state reset) on
  // every open without needing refs in render or setState in useEffect.
  const openCount = useUiStore((s) => s.commandPaletteOpenCount);
  const newRequestDiscardOpen = useUiStore((s) => s.newRequestDiscardOpen);
  const setNewRequestDiscardOpen = useUiStore(
    (s) => s.setNewRequestDiscardOpen,
  );
  const mainView = useUiStore((s) => s.mainView);
  const pendingTabCloseId = useUiStore((s) => s.pendingTabCloseId);
  const setPendingTabCloseId = useUiStore((s) => s.setPendingTabCloseId);
  const discardDialogCopy = getDiscardDialogCopy(mainView);

  // Register ⌘K / Ctrl+K globally to open the palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && !e.altKey && e.key === 'k') {
        e.preventDefault();
        useUiStore.getState().setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[15%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
        >
          <PaletteContent key={openCount} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Discard confirmation triggered by the "New Request" command. */}
      <ConfirmDiscardDialog
        open={newRequestDiscardOpen}
        onOpenChange={setNewRequestDiscardOpen}
        onConfirm={resetActiveWorkspace}
        title={t(discardDialogCopy.titleKey)}
        description={t(discardDialogCopy.descriptionKey)}
      />

      <ConfirmDiscardDialog
        open={pendingTabCloseId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingTabCloseId(null);
        }}
        onConfirm={() => {
          if (pendingTabCloseId) {
            useTabStore.getState().closeTab(pendingTabCloseId);
          }
          setPendingTabCloseId(null);
        }}
        title={t('navigation.closeTabQuestion')}
        description={t('navigation.closeTabDescription')}
      />
    </>
  );
}
