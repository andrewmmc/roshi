import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Trash2,
  Search,
  X,
  Download,
  SlidersHorizontal,
  GitCompare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { HistoryItem } from './HistoryItem';
import { HistoryCompareDrawer } from './HistoryCompareDrawer';
import { HistoryFiltersSheet } from './HistoryFiltersSheet';
import { useHistory } from '@/hooks/use-history';
import { exportHistory } from '@/utils/export';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useUiStore } from '@/stores/ui-store';
import { useCollections } from '@/hooks/use-collections';
import type { HistoryEntry } from '@/types/history';
import {
  buildComposerHistoryRestore,
  buildResponseHistoryRestore,
  buildHistoryRestoreWarning,
  resolveHistorySelection,
} from '@/utils/history-restore';
import { toast } from '@/stores/toast-store';
import {
  DEFAULT_HISTORY_FILTERS,
  buildHistoryModelOptions,
  buildHistoryProviderOptions,
  filterHistoryEntries,
  isDefaultHistoryFilters,
  type HistoryFilters,
} from '@/utils/history-filter';

function HistorySearchControls({
  searchQuery,
  isFiltering,
  filteredCount,
  totalCount,
  searchInputRef,
  onSearchChange,
}: {
  searchQuery: string;
  isFiltering: boolean;
  filteredCount: number;
  totalCount: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="shrink-0 px-3 pt-2.5 pb-1.5">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          ref={searchInputRef}
          placeholder="Search history..."
          aria-label="Search history"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-sidebar-accent/30 border-sidebar-border h-7 pr-7 pl-7 text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2"
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {isFiltering && (
        <div className="flex items-center pt-1">
          <span className="bg-sidebar-accent/70 text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-[11px]">
            Filters active ·{' '}
            <span>
              {filteredCount} of {totalCount}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function DeleteAllHistoryDialog({
  open,
  entryCount,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  entryCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete all history?</DialogTitle>
          <DialogDescription>
            This will permanently remove all {entryCount} history entries. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HistoryList({ headerSlot }: { headerSlot?: ReactNode }) {
  const { entries, deleteEntry, clearAll } = useHistory();
  const { collections, savedRequests } = useCollections();
  const loadComposerFromHistory = useComposerStore(
    (s) => s.loadComposerFromHistory,
  );
  const loadResponseFromHistory = useResponseStore(
    (s) => s.loadResponseFromHistory,
  );
  const hasUnsavedChanges = useComposerStore(selectHasUnsavedChanges);
  const providers = useProviderStore((s) => s.providers);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const addModelToProvider = useProviderStore((s) => s.addModelToProvider);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const pendingEntryRef = useRef<HistoryEntry | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>(
    DEFAULT_HISTORY_FILTERS,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const historySearchFocusGen = useUiStore((s) => s.historySearchFocusGen);

  useEffect(() => {
    if (historySearchFocusGen === 0) return;
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [historySearchFocusGen]);

  const providerOptions = useMemo(
    () => buildHistoryProviderOptions(entries),
    [entries],
  );

  const modelOptions = useMemo(
    () => buildHistoryModelOptions(entries),
    [entries],
  );

  const filtered = useMemo(
    () => filterHistoryEntries(entries, filters),
    [entries, filters],
  );

  const isFiltering = !isDefaultHistoryFilters(filters);

  const handleFilterChange = useCallback((updates: Partial<HistoryFilters>) => {
    setFilters((current) => ({ ...current, ...updates }));
  }, []);

  const applyHistoryEntry = useCallback(
    async (entry: HistoryEntry) => {
      const selection = resolveHistorySelection(entry, providers);
      const warning = buildHistoryRestoreWarning(selection);

      if (selection.providerId) {
        selectProvider(selection.providerId);
      }

      if (selection.restoredModel) {
        await addModelToProvider(
          selection.providerId!,
          selection.restoredModel,
        );
        selectModel(selection.restoredModel.id);
        toast(
          `Added "${selection.originalModelId}" back to ${selection.originalProviderName}.`,
        );
      } else if (selection.modelId) {
        selectModel(selection.modelId);
      }

      loadComposerFromHistory(buildComposerHistoryRestore(entry));
      loadResponseFromHistory(buildResponseHistoryRestore(entry));

      if (warning) {
        toast(warning, 4000);
      }
    },
    [
      providers,
      selectProvider,
      selectModel,
      addModelToProvider,
      loadComposerFromHistory,
      loadResponseFromHistory,
    ],
  );

  const handleSelect = useCallback(
    (entry: HistoryEntry) => {
      if (hasUnsavedChanges) {
        pendingEntryRef.current = entry;
        setShowDiscard(true);
      } else {
        applyHistoryEntry(entry);
      }
    },
    [hasUnsavedChanges, applyHistoryEntry],
  );

  const handleDiscardConfirm = useCallback(() => {
    if (pendingEntryRef.current) {
      applyHistoryEntry(pendingEntryRef.current);
      pendingEntryRef.current = null;
    }
  }, [applyHistoryEntry]);

  const handleToggleCompare = useCallback((entryId: string) => {
    setCompareSelection((current) => {
      if (current.includes(entryId)) {
        return current.filter((id) => id !== entryId);
      }
      if (current.length >= 2) {
        return [current[1], entryId];
      }
      return [...current, entryId];
    });
  }, []);

  const compareEntries = useMemo(() => {
    if (compareSelection.length !== 2) return null;
    const first = entries.find((entry) => entry.id === compareSelection[0]);
    const second = entries.find((entry) => entry.id === compareSelection[1]);
    if (!first || !second) return null;
    return [first, second] as [HistoryEntry, HistoryEntry];
  }, [compareSelection, entries]);

  const handleExitCompareMode = useCallback(() => {
    setCompareMode(false);
    setCompareSelection([]);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border flex h-9 shrink-0 items-center justify-between border-b px-3">
        {headerSlot ?? (
          <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            History
          </span>
        )}
        {entries.length > 0 && (
          <div className="flex items-center">
            <IconButton
              variant="ghost"
              size="icon"
              className={`relative h-7 w-7 ${
                compareMode
                  ? 'bg-sidebar-accent text-primary hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                if (compareMode) {
                  handleExitCompareMode();
                  return;
                }
                setCompareMode(true);
              }}
              tooltip={
                compareMode ? 'Exit prompt compare' : 'Compare prompt diffs'
              }
            >
              <GitCompare className="h-3 w-3" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="icon"
              className={`relative h-7 w-7 ${
                isFiltering
                  ? 'bg-sidebar-accent text-primary hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setShowFilters(true)}
              tooltip="Filter history"
            >
              <SlidersHorizontal className="h-3 w-3" />
              {isFiltering && (
                <span className="bg-primary absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" />
              )}
            </IconButton>
            <IconButton
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-7 w-7"
              onClick={() => exportHistory(entries)}
              tooltip="Export all history as JSON"
            >
              <Download className="h-3 w-3" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-7 w-7"
              onClick={() => setShowConfirm(true)}
              tooltip="Clear all history"
            >
              <Trash2 className="h-3 w-3" />
            </IconButton>
          </div>
        )}
      </div>
      {entries.length > 0 && (
        <HistorySearchControls
          searchQuery={filters.searchQuery}
          isFiltering={isFiltering}
          filteredCount={filtered.length}
          totalCount={entries.length}
          searchInputRef={searchInputRef}
          onSearchChange={(searchQuery) => handleFilterChange({ searchQuery })}
        />
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-px p-1">
          {entries.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
              <p className="text-muted-foreground text-xs">
                Every request you send is saved here for quick replay.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const composer = useComposerStore.getState();
                  const sample =
                    'Explain what an LLM API request looks like in one short paragraph.';
                  const firstUserIndex = composer.messages.findIndex(
                    (message) => message.role === 'user',
                  );
                  if (firstUserIndex >= 0) {
                    composer.updateMessage(firstUserIndex, {
                      ...composer.messages[firstUserIndex],
                      content: sample,
                    });
                  } else {
                    composer.addMessage({ role: 'user', content: sample });
                  }
                }}
              >
                Insert sample prompt
              </Button>
            </div>
          )}
          {entries.length > 0 && filtered.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              No matching entries
            </p>
          )}
          {filtered.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onSelect={handleSelect}
              onDelete={deleteEntry}
              compareMode={compareMode}
              compareSelected={compareSelection.includes(entry.id)}
              onToggleCompare={handleToggleCompare}
            />
          ))}
        </div>
      </ScrollArea>

      {compareEntries && (
        <HistoryCompareDrawer
          entries={compareEntries}
          onClose={handleExitCompareMode}
        />
      )}

      <DeleteAllHistoryDialog
        open={showConfirm}
        entryCount={entries.length}
        onOpenChange={setShowConfirm}
        onConfirm={() => {
          clearAll();
          setShowConfirm(false);
        }}
      />

      <HistoryFiltersSheet
        open={showFilters}
        filters={filters}
        isFiltering={isFiltering}
        providerOptions={providerOptions}
        modelOptions={modelOptions}
        collectionOptions={collections}
        savedRequestOptions={savedRequests}
        onOpenChange={setShowFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={() => setFilters(DEFAULT_HISTORY_FILTERS)}
      />

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}
