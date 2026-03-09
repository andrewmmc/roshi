import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HistoryEntry } from '@/types/history';

interface HistoryItemProps {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

export function HistoryItem({ entry, onSelect, onDelete }: HistoryItemProps) {
  const firstUserMessage = entry.request.messages.find((m) => m.role === 'user');
  const preview = firstUserMessage?.content.slice(0, 80) || 'No message';
  const hasError = !!entry.error;

  return (
    <button
      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 group transition-colors"
      onClick={() => onSelect(entry)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span>{entry.providerName}</span>
            <span className="opacity-50">·</span>
            <span className="truncate">{entry.modelId}</span>
          </div>
          <div className={`text-sm truncate mt-0.5 ${hasError ? 'text-destructive' : ''}`}>
            {preview}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(entry.createdAt).toLocaleString()}
            {entry.durationMs !== null && ` · ${entry.durationMs}ms`}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </button>
  );
}
