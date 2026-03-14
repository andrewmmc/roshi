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
    <div className="relative group">
      <button
        className="w-full text-left px-2.5 py-1.5 rounded hover:bg-sidebar-accent transition-colors pr-9"
        onClick={() => onSelect(entry)}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="truncate">{entry.providerName}</span>
            <span className="opacity-40">/</span>
            <span className="truncate">{entry.modelId}</span>
          </div>
          <div className={`text-[13px] truncate leading-snug ${hasError ? 'text-destructive' : 'text-foreground/80'}`}>
            {preview}
          </div>
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
            {new Date(entry.createdAt).toLocaleString()}
            {entry.durationMs !== null && ` · ${entry.durationMs}ms`}
          </div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(entry.id);
        }}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}
