import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { usePricing } from '@/hooks/use-pricing';
import { formatUsd } from '@/lib/token-pricing';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import type { HistoryEntry } from '@/types/history';

export function HistoryList() {
  const { entries, deleteEntry, clearAll } = useHistory();
  const { estimateUsageCostUsd } = usePricing();
  const loadFromHistory = useRequestStore((s) => s.loadFromHistory);
  const providers = useProviderStore((s) => s.providers);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const [showConfirm, setShowConfirm] = useState(false);

  const entryCosts = useMemo(() => {
    return Object.fromEntries(
      entries.map((entry) => {
        const usage = entry.response?.usage;
        if (!usage) {
          return [entry.id, null];
        }

        const activeProvider = providers.find((provider) => provider.id === entry.providerId);
        const providerContext = activeProvider
          ? {
              type: activeProvider.type,
              name: activeProvider.name,
              baseUrl: activeProvider.baseUrl,
            }
          : {
              type: entry.providerType || 'custom',
              name: entry.providerName,
              baseUrl: '',
            };

        return [entry.id, estimateUsageCostUsd(providerContext, entry.modelId, usage)];
      }),
    );
  }, [entries, estimateUsageCostUsd, providers]);

  const runningTotalUsd = useMemo(() => {
    return Object.values(entryCosts).reduce((sum, cost) => {
      if (typeof cost !== 'number') {
        return sum;
      }
      return sum + cost;
    }, 0);
  }, [entryCosts]);

  const pricedEntryCount = useMemo(() => {
    return Object.values(entryCosts).filter((cost) => typeof cost === 'number').length;
  }, [entryCosts]);

  const handleSelect = (entry: HistoryEntry) => {
    selectProvider(entry.providerId);
    selectModel(entry.modelId);
    loadFromHistory({
      messages: entry.request.messages,
      systemPrompt: entry.request.systemPrompt || '',
      temperature: entry.request.temperature || 1,
      maxTokens: entry.request.maxTokens || 4096,
      stream: entry.request.stream,
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            History
          </span>
          {entries.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground/80">
              Total {pricedEntryCount > 0 ? formatUsd(runningTotalUsd) : 'price n/a'}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-px p-1">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No history yet
            </p>
          )}
          {entries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              costUsd={entryCosts[entry.id] ?? null}
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
