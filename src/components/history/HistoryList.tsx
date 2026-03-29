import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  DEFAULT_TOP_P,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
} from '@/constants/defaults';
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
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import type { HistoryEntry } from '@/types/history';

export function HistoryList() {
  const { entries, deleteEntry, clearAll } = useHistory();
  const loadFromHistory = useRequestStore((s) => s.loadFromHistory);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const [showConfirm, setShowConfirm] = useState(false);

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
