import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useTabStore } from '@/stores/tab-store';
import { useProviderStore } from '@/stores/provider-store';
import { useThemeStore } from '@/stores/theme-store';
import { useResponseStore } from '@/stores/response-store';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { IS_MAC } from '@/lib/platform';
import { toast } from '@/stores/toast-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  group: string;
  shortcut?: { mac: string; win: string };
  action: () => void;
}

// ---------------------------------------------------------------------------
// Small helper: renders shortcut keys as <kbd> badges
// ---------------------------------------------------------------------------

function ShortcutBadge({ mac, win }: { mac: string; win: string }) {
  const keys = IS_MAC ? [...mac] : win.split('+');
  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="border-foreground/15 bg-foreground/8 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[10px] leading-none font-medium tracking-wide"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inner content component — remounted on each palette open via `key` so that
// query and selectedIndex start fresh without needing setState-in-effect.
// ---------------------------------------------------------------------------

function PaletteContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const { send, cancel } = useSendRequest();
  const providers = useProviderStore((s) => s.providers);
  const selectedProviderId = useProviderStore((s) => s.selectedProviderId);

  // Build the full command list. Dynamic provider/model entries are derived
  // from store state at memo time; actions read live state via getState().
  const allCommands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      {
        id: 'send',
        label: 'Send Request',
        group: 'Actions',
        shortcut: { mac: '⌘↵', win: 'Ctrl+↵' },
        action: () => {
          const { isLoading } = useResponseStore.getState();
          const { providers: ps } = useProviderStore.getState();
          if (!isLoading && ps.length > 0) send();
        },
      },
      {
        id: 'cancel',
        label: 'Stop Request',
        group: 'Actions',
        shortcut: { mac: 'Esc', win: 'Esc' },
        action: () => {
          const { isLoading } = useResponseStore.getState();
          if (isLoading) cancel();
        },
      },
      {
        id: 'new-request',
        label: 'New Request',
        group: 'Actions',
        shortcut: { mac: '⌘⇧N', win: 'Ctrl+Shift+N' },
        action: () => {
          const hasUnsaved = selectHasUnsavedChanges(
            useComposerStore.getState(),
          );
          if (hasUnsaved) {
            useUiStore.getState().setNewRequestDiscardOpen(true);
          } else {
            useComposerStore.getState().resetComposer();
            useResponseStore.getState().resetResponse();
          }
        },
      },
      {
        id: 'new-tab',
        label: 'New Tab',
        group: 'Actions',
        action: () => useTabStore.getState().createTab(),
      },
      {
        id: 'duplicate-tab',
        label: 'Duplicate Tab',
        group: 'Actions',
        action: () => useTabStore.getState().duplicateActiveTab(),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        group: 'Actions',
        shortcut: { mac: '⌥T', win: 'Alt+T' },
        action: () => useThemeStore.getState().toggle(),
      },
      {
        id: 'copy-response',
        label: 'Copy Response',
        group: 'Actions',
        shortcut: { mac: '⌥C', win: 'Alt+C' },
        action: () => {
          const { response, streamingContent } = useResponseStore.getState();
          const text = response?.content ?? streamingContent;
          if (text) {
            navigator.clipboard
              .writeText(text)
              .then(() => toast('Copied to clipboard'))
              .catch(() => {});
          }
        },
      },
      {
        id: 'focus-history',
        label: 'Search History',
        group: 'Navigation',
        shortcut: { mac: '⌘P', win: 'Ctrl+P' },
        action: () => useUiStore.getState().focusHistorySearch(),
      },
      {
        id: 'settings-providers',
        label: 'Settings: Providers',
        group: 'Navigation',
        shortcut: { mac: '⌘⇧,', win: 'Ctrl+Shift+,' },
        action: () => useUiStore.getState().setSettingsOpen(true, 'providers'),
      },
      {
        id: 'settings-environments',
        label: 'Settings: Environments',
        group: 'Navigation',
        action: () =>
          useUiStore.getState().setSettingsOpen(true, 'environments'),
      },
      {
        id: 'settings-models',
        label: 'Settings: Models',
        group: 'Navigation',
        action: () => useUiStore.getState().openModelMarket(),
      },
      {
        id: 'show-shortcuts',
        label: 'Keyboard Shortcuts',
        group: 'Navigation',
        shortcut: { mac: '?', win: '?' },
        action: () => useUiStore.getState().setShortcutsOpen(true),
      },
      {
        id: 'about',
        label: 'About Roshi',
        group: 'Navigation',
        action: () => useUiStore.getState().setAboutOpen(true),
      },
    ];

    // Dynamic: one entry per provider.
    for (const p of providers) {
      cmds.push({
        id: `switch-provider-${p.id}`,
        label: `Switch to: ${p.name}`,
        group: 'Providers',
        action: () => useProviderStore.getState().selectProvider(p.id),
      });
    }

    // Dynamic: models for the currently selected provider.
    const selectedProvider = providers.find((p) => p.id === selectedProviderId);
    if (selectedProvider) {
      for (const m of selectedProvider.models) {
        cmds.push({
          id: `select-model-${m.id}`,
          label: `Model: ${m.displayName}`,
          group: 'Models',
          action: () => useProviderStore.getState().selectModel(m.id),
        });
      }
    }

    return cmds;
  }, [providers, selectedProviderId, send, cancel]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lq = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(lq) ||
        c.group.toLowerCase().includes(lq),
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
  const effectiveIndex =
    filteredCommands.length > 0
      ? Math.min(selectedIndex, filteredCommands.length - 1)
      : 0;

  // Scroll the selected item into view on navigation (no setState, DOM only).
  useEffect(() => {
    itemRefs.current[effectiveIndex]?.scrollIntoView({ block: 'nearest' });
  }, [effectiveIndex]);

  const runAndClose = useCallback(
    (action: () => void) => {
      action();
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
        setSelectedIndex((i) => (i + 1) % count);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i <= 0 ? count - 1 : i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[effectiveIndex];
        if (cmd) runAndClose(cmd.action);
      }
    },
    [filteredCommands, effectiveIndex, runAndClose],
  );

  return (
    <>
      {/* Search input row */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <SearchIcon className="text-muted-foreground h-4 w-4 shrink-0" />
        <input
          autoFocus
          className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          placeholder="Search commands…"
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
            No commands found.
          </p>
        ) : (
          <div className="py-1">
            {displayGroups.map((group) => (
              <div key={group.label}>
                <p className="text-muted-foreground px-3 pt-2 pb-0.5 text-[10px] font-semibold tracking-wider uppercase first:pt-1">
                  {group.label}
                </p>
                {group.items.map(({ cmd, flatIdx }) => (
                  <div
                    key={cmd.id}
                    ref={(el) => {
                      itemRefs.current[flatIdx] = el;
                    }}
                    className={cn(
                      'mx-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm',
                      effectiveIndex === flatIdx
                        ? 'bg-accent'
                        : 'hover:bg-accent/50',
                    )}
                    onClick={() => runAndClose(cmd.action)}
                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                  >
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.shortcut && (
                      <ShortcutBadge
                        mac={cmd.shortcut.mac}
                        win={cmd.shortcut.win}
                      />
                    )}
                  </div>
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
        onConfirm={() => {
          useComposerStore.getState().resetComposer();
          useResponseStore.getState().resetResponse();
        }}
      />
    </>
  );
}
