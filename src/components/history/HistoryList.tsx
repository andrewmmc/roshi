import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HistoryItem } from './HistoryItem';
import { useHistory } from '@/hooks/use-history';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import type { HistoryEntry } from '@/types/history';

export function HistoryList() {
  const { entries, deleteEntry, clearAll } = useHistory();
  const loadFromHistory = useRequestStore((s) => s.loadFromHistory);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);

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
            onClick={clearAll}
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
              onSelect={handleSelect}
              onDelete={deleteEntry}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
