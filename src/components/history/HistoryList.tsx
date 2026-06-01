import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Trash2, Search, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/utils/history-restore';
import {
  DEFAULT_HISTORY_FILTERS,
  filterHistoryEntries,
  isDefaultHistoryFilters,
  type HistoryFilters,
  type HistoryStatusFilter,
} from '@/utils/history-filter';

const STATUS_FILTERS = ['all', 'success', 'error'] as const;
const STATUS_CODE_FILTERS = [
  'all',
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'none',
] as const;
const DATE_FILTERS = ['all', 'today', '7d', '30d'] as const;

function getStatusLabel(status: HistoryStatusFilter): string {
  if (status === 'all') return 'All';
  if (status === 'success') return 'Success';
  return 'Error';
}

function getDateLabel(value: string): string {
  if (value === 'today') return 'Today';
  if (value === '7d') return 'Last 7 days';
  if (value === '30d') return 'Last 30 days';
  return 'Any time';
}

function HistorySearchControls({
  searchQuery,
  filters,
  isFiltering,
  filteredCount,
  totalCount,
  searchInputRef,
  providerOptions,
  modelOptions,
  collectionOptions,
  savedRequestOptions,
  onSearchChange,
  onFilterChange,
  onClearFilters,
}: {
  searchQuery: string;
  filters: HistoryFilters;
  isFiltering: boolean;
  filteredCount: number;
  totalCount: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  providerOptions: { id: string; name: string }[];
  modelOptions: string[];
  collectionOptions: { id: string; name: string }[];
  savedRequestOptions: { id: string; name: string }[];
  onSearchChange: (value: string) => void;
  onFilterChange: (updates: Partial<HistoryFilters>) => void;
  onClearFilters: () => void;
}) {
  const providerLabel =
    filters.providerId === 'all'
      ? 'All providers'
      : (providerOptions.find((provider) => provider.id === filters.providerId)
          ?.name ?? 'Provider');
  const modelLabel = filters.modelId === 'all' ? 'All models' : filters.modelId;
  const collectionLabel =
    filters.collectionId === 'all'
      ? 'All collections'
      : (collectionOptions.find(
          (collection) => collection.id === filters.collectionId,
        )?.name ?? 'Collection');
  const savedRequestLabel =
    filters.savedRequestId === 'all'
      ? 'All requests'
      : (savedRequestOptions.find(
          (request) => request.id === filters.savedRequestId,
        )?.name ?? 'Request');

  return (
    <div className="shrink-0 space-y-1.5 px-2 pt-2 pb-1">
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
      <div className="flex gap-1">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange({ status })}
            aria-pressed={filters.status === status}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              filters.status === status
                ? 'bg-sidebar-accent/80 text-foreground'
                : 'text-muted-foreground hover:text-foreground/80 hover:bg-sidebar-accent/50'
            }`}
          >
            {getStatusLabel(status)}
          </button>
        ))}
        {isFiltering && (
          <span className="text-muted-foreground/70 ml-auto self-center text-[10px]">
            {filteredCount} of {totalCount}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <Select
          value={filters.providerId}
          onValueChange={(providerId) =>
            onFilterChange({ providerId: providerId ?? 'all' })
          }
        >
          <SelectTrigger
            aria-label="Filter by provider"
            className="h-7 w-full text-xs"
          >
            <SelectValue>{providerLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providerOptions.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.modelId}
          onValueChange={(modelId) =>
            onFilterChange({ modelId: modelId ?? 'all' })
          }
        >
          <SelectTrigger
            aria-label="Filter by model"
            className="h-7 w-full text-xs"
          >
            <SelectValue>{modelLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {modelOptions.map((modelId) => (
              <SelectItem key={modelId} value={modelId}>
                {modelId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.dateRange}
          onValueChange={(dateRange) =>
            onFilterChange({
              dateRange: (dateRange ?? 'all') as HistoryFilters['dateRange'],
            })
          }
        >
          <SelectTrigger
            aria-label="Filter by date"
            className="h-7 w-full text-xs"
          >
            <SelectValue>{getDateLabel(filters.dateRange)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DATE_FILTERS.map((dateRange) => (
              <SelectItem key={dateRange} value={dateRange}>
                {getDateLabel(dateRange)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.statusCodeClass}
          onValueChange={(statusCodeClass) =>
            onFilterChange({
              statusCodeClass: (statusCodeClass ??
                'all') as HistoryFilters['statusCodeClass'],
            })
          }
        >
          <SelectTrigger
            aria-label="Filter by status code"
            className="h-7 w-full text-xs"
          >
            <SelectValue>
              {filters.statusCodeClass === 'all'
                ? 'Any HTTP'
                : filters.statusCodeClass === 'none'
                  ? 'No status'
                  : filters.statusCodeClass}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_CODE_FILTERS.map((statusCodeClass) => (
              <SelectItem key={statusCodeClass} value={statusCodeClass}>
                {statusCodeClass === 'all'
                  ? 'Any HTTP status'
                  : statusCodeClass === 'none'
                    ? 'No status'
                    : statusCodeClass}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.collectionId}
          onValueChange={(collectionId) =>
            onFilterChange({ collectionId: collectionId ?? 'all' })
          }
        >
          <SelectTrigger
            aria-label="Filter by collection"
            className="h-7 w-full text-xs"
          >
            <SelectValue>{collectionLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All collections</SelectItem>
            {collectionOptions.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.savedRequestId}
          onValueChange={(savedRequestId) =>
            onFilterChange({ savedRequestId: savedRequestId ?? 'all' })
          }
        >
          <SelectTrigger
            aria-label="Filter by saved request"
            className="h-7 w-full text-xs"
          >
            <SelectValue>{savedRequestLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All requests</SelectItem>
            {savedRequestOptions.map((request) => (
              <SelectItem key={request.id} value={request.id}>
                {request.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isFiltering && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="bg-sidebar-accent/70 text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
            Filters active
          </span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-[10px] underline-offset-2 hover:underline"
            onClick={onClearFilters}
          >
            Clear all
          </button>
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

export function HistoryList() {
  const { entries, deleteEntry, clearAll } = useHistory();
  const { collections, savedRequests } = useCollections();
  const loadComposerFromHistory = useComposerStore(
    (s) => s.loadComposerFromHistory,
  );
  const loadResponseFromHistory = useResponseStore(
    (s) => s.loadResponseFromHistory,
  );
  const hasUnsavedChanges = useComposerStore(selectHasUnsavedChanges);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
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

  const providerOptions = useMemo(() => {
    const providers = new Map<string, string>();
    for (const entry of entries)
      providers.set(entry.providerId, entry.providerName);
    return [...providers.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const modelOptions = useMemo(
    () =>
      [
        ...new Set(entries.map((entry) => entry.modelId).filter(Boolean)),
      ].sort(),
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
    (entry: HistoryEntry) => {
      selectProvider(entry.providerId);
      selectModel(entry.modelId);
      loadComposerFromHistory(buildComposerHistoryRestore(entry));
      loadResponseFromHistory(buildResponseHistoryRestore(entry));
    },
    [
      selectProvider,
      selectModel,
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

  return (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border flex h-10 shrink-0 items-center justify-between border-b px-3">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          History
        </span>
        {entries.length > 0 && (
          <div className="flex items-center">
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
          filters={filters}
          isFiltering={isFiltering}
          filteredCount={filtered.length}
          totalCount={entries.length}
          searchInputRef={searchInputRef}
          providerOptions={providerOptions}
          modelOptions={modelOptions}
          collectionOptions={collections}
          savedRequestOptions={savedRequests}
          onSearchChange={(searchQuery) => handleFilterChange({ searchQuery })}
          onFilterChange={handleFilterChange}
          onClearFilters={() => setFilters(DEFAULT_HISTORY_FILTERS)}
        />
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-px p-1">
          {entries.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              No history yet
            </p>
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
            />
          ))}
        </div>
      </ScrollArea>

      <DeleteAllHistoryDialog
        open={showConfirm}
        entryCount={entries.length}
        onOpenChange={setShowConfirm}
        onConfirm={() => {
          clearAll();
          setShowConfirm(false);
        }}
      />

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}
