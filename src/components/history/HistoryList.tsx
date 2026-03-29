import { useState, useMemo } from 'react';
import { Trash2, Search, X } from 'lucide-react';
import {
  DEFAULT_TOP_P,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
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
import { HistoryItem } from './HistoryItem';
import { useHistory } from '@/hooks/use-history';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import type { HistoryEntry } from '@/types/history';

type StatusFilter = 'all' | 'success' | 'error';

export function HistoryList() {
  const { entries, deleteEntry, clearAll } = useHistory();
  const loadFromHistory = useRequestStore((s) => s.loadFromHistory);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    let result = entries;
    if (statusFilter === 'error') result = result.filter((e) => e.error !== null);
    if (statusFilter === 'success') result = result.filter((e) => e.error === null);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const msg = e.request.messages.find((m) => m.role === 'user')?.content ?? '';
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

  const handleSelect = (entry: HistoryEntry) => {
    selectProvider(entry.providerId);
    selectModel(entry.modelId);
    loadFromHistory({
      messages: entry.request.messages,
      systemPrompt: entry.request.systemPrompt ?? '',
      temperature: entry.request.temperature ?? 1,
      maxTokens: entry.request.maxTokens ?? 4096,
      topP: entry.request.topP ?? DEFAULT_TOP_P,
      frequencyPenalty: entry.request.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: entry.request.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
      stream: entry.request.stream,
      customHeaders: entry.customHeaders ?? [],
      response: entry.response,
      rawRequest: entry.rawRequest,
      rawResponse: entry.rawResponse,
      error: entry.error,
      durationMs: entry.durationMs,
      statusCode: entry.statusCode,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 h-10 border-b border-sidebar-border shrink-0">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          History
        </span>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => setShowConfirm(true)}
            aria-label="Clear all history"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {entries.length > 0 && (
        <div className="px-2 pt-2 pb-1 space-y-1.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 pr-7 text-xs bg-sidebar-accent/50 border-sidebar-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80 hover:bg-sidebar-accent/50'
                }`}
              >
                {status === 'all' ? 'All' : status === 'success' ? 'Success' : 'Error'}
              </button>
            ))}
            {isFiltering && (
              <span className="text-[10px] text-muted-foreground/70 ml-auto self-center">
                {filtered.length} of {entries.length}
              </span>
            )}
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-px p-1">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No history yet
            </p>
          )}
          {entries.length > 0 && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
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
              This will permanently remove all {entries.length} history entries. This action cannot be undone.
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
    </div>
  );
}
