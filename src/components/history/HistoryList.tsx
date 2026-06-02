import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Trash2, Search, X, Download, SlidersHorizontal } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  onSearchChange,
  onFilterChange,
}: {
  searchQuery: string;
  filters: HistoryFilters;
  isFiltering: boolean;
  filteredCount: number;
  totalCount: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onFilterChange: (updates: Partial<HistoryFilters>) => void;
}) {
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
      <div className="flex flex-wrap items-center gap-1">
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
          <span className="bg-sidebar-accent/70 text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-[10px]">
            Filters active ·{' '}
            <span>
              {filteredCount} of {totalCount}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function HistoryFiltersSheet({
  open,
  filters,
  isFiltering,
  providerOptions,
  modelOptions,
  collectionOptions,
  savedRequestOptions,
  onOpenChange,
  onFilterChange,
  onClearFilters,
}: {
  open: boolean;
  filters: HistoryFilters;
  isFiltering: boolean;
  providerOptions: { id: string; name: string }[];
  modelOptions: string[];
  collectionOptions: { id: string; name: string }[];
  savedRequestOptions: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
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

  const handleClearFilters = () => {
    onClearFilters();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="history-filters-description">
        <SheetHeader className="pr-12">
          <SheetTitle>History filters</SheetTitle>
          <SheetDescription id="history-filters-description">
            Narrow history by provider, model, date, response, collection, or
            saved request.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Provider
            </span>
            <Select
              value={filters.providerId}
              onValueChange={(providerId) =>
                onFilterChange({ providerId: providerId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by provider"
                className="h-8 w-full text-xs"
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
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Model
            </span>
            <Select
              value={filters.modelId}
              onValueChange={(modelId) =>
                onFilterChange({ modelId: modelId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by model"
                className="h-8 w-full text-xs"
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
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Date range
            </span>
            <Select
              value={filters.dateRange}
              onValueChange={(dateRange) =>
                onFilterChange({
                  dateRange: (dateRange ??
                    'all') as HistoryFilters['dateRange'],
                })
              }
            >
              <SelectTrigger
                aria-label="Filter by date"
                className="h-8 w-full text-xs"
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
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Status code
            </span>
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
                className="h-8 w-full text-xs"
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
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Collection
            </span>
            <Select
              value={filters.collectionId}
              onValueChange={(collectionId) =>
                onFilterChange({ collectionId: collectionId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by collection"
                className="h-8 w-full text-xs"
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
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Saved request
            </span>
            <Select
              value={filters.savedRequestId}
              onValueChange={(savedRequestId) =>
                onFilterChange({ savedRequestId: savedRequestId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by saved request"
                className="h-8 w-full text-xs"
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
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            className="w-full"
            disabled={!isFiltering}
            onClick={handleClearFilters}
          >
            Clear all filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
  const [showFilters, setShowFilters] = useState(false);
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
          filters={filters}
          isFiltering={isFiltering}
          filteredCount={filtered.length}
          totalCount={entries.length}
          searchInputRef={searchInputRef}
          onSearchChange={(searchQuery) => handleFilterChange({ searchQuery })}
          onFilterChange={handleFilterChange}
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
