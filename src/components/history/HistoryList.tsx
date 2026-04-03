import { useState, useMemo, useCallback, useRef } from 'react';
import { Trash2, Search, X } from 'lucide-react';
import {
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_THINKING_ENABLED,
  DEFAULT_THINKING_BUDGET_TOKENS,
} from '@/constants/defaults';
import { Button } from '@/components/ui/button';
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
import { useHistory } from '@/hooks/use-history';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import type { HistoryEntry } from '@/types/history';

type StatusFilter = 'all' | 'success' | 'error';

export function HistoryList() {
  const { entries, deleteEntry, clearAll } = useHistory();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    let result = entries;
    if (statusFilter === 'error')
      result = result.filter((e) => e.error !== null);
    if (statusFilter === 'success')
      result = result.filter((e) => e.error === null);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const msg =
          e.request.messages.find((m) => m.role === 'user')?.content ?? '';
        return (
          e.providerName.toLowerCase().includes(q) ||
          e.modelId.toLowerCase().includes(q) ||
          msg.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [entries, searchQuery, statusFilter]);

  const isFiltering = searchQuery.trim() !== '' || statusFilter !== 'all';

  const applyHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      selectProvider(entry.providerId);
      selectModel(entry.modelId);
      // Restore sent messages; if a response exists, also append the assistant
      // reply and an empty user row so the composer is ready for multi-turn.
      const restoredMessages = [...entry.request.messages];
      if (entry.response?.content) {
        restoredMessages.push({
          role: 'assistant',
          content: entry.response.content,
        });
        restoredMessages.push({ role: 'user', content: '' });
      }
      loadComposerFromHistory({
        messages: restoredMessages,
        systemPrompt: entry.request.systemPrompt ?? '',
        temperature: entry.request.temperature ?? 1,
        maxTokens: entry.request.maxTokens ?? 4096,
        topP: entry.request.topP ?? DEFAULT_TOP_P,
        topK: entry.request.topK ?? DEFAULT_TOP_K,
        frequencyPenalty:
          entry.request.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
        presencePenalty:
          entry.request.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
        stream: entry.request.stream,
        thinkingEnabled:
          entry.request.thinking?.enabled ?? DEFAULT_THINKING_ENABLED,
        thinkingBudgetTokens:
          entry.request.thinking?.budgetTokens ??
          DEFAULT_THINKING_BUDGET_TOKENS,
        customHeaders: entry.customHeaders ?? [],
      });
      loadResponseFromHistory({
        messages: entry.request.messages,
        stream: entry.request.stream,
        systemPrompt: entry.request.systemPrompt ?? '',
        temperature: entry.request.temperature ?? 1,
        maxTokens: entry.request.maxTokens ?? 4096,
        response: entry.response,
        rawRequest: entry.rawRequest,
        rawResponse: entry.rawResponse,
        requestUrl: entry.requestUrl ?? null,
        error: entry.error,
        durationMs: entry.durationMs,
        statusCode: entry.statusCode,
      });
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
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-5 w-5"
            onClick={() => setShowConfirm(true)}
            aria-label="Clear all history"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {entries.length > 0 && (
        <div className="shrink-0 space-y-1.5 px-2 pt-2 pb-1">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-sidebar-accent/50 border-sidebar-border h-7 pr-7 pl-7 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {(['all', 'success', 'error'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80 hover:bg-sidebar-accent/50'
                }`}
              >
                {status === 'all'
                  ? 'All'
                  : status === 'success'
                    ? 'Success'
                    : 'Error'}
              </button>
            ))}
            {isFiltering && (
              <span className="text-muted-foreground/70 ml-auto self-center text-[10px]">
                {filtered.length} of {entries.length}
              </span>
            )}
          </div>
        </div>
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all history?</DialogTitle>
            <DialogDescription>
              This will permanently remove all {entries.length} history entries.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAll();
                setShowConfirm(false);
              }}
            >
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={showDiscard}
        onOpenChange={setShowDiscard}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}
