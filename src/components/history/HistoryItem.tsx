import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HistoryEntry } from '@/types/history';

interface HistoryItemProps {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

export function HistoryItem({ entry, onSelect, onDelete }: HistoryItemProps) {
  const firstUserMessage = entry.request.messages.find(
    (m) => m.role === 'user',
  );
  const preview = firstUserMessage?.content.slice(0, 80) || 'No message';
  const hasError = !!entry.error;

  return (
    <div className="group relative">
      <button
        className="hover:bg-sidebar-accent w-full rounded px-2.5 py-1.5 pr-9 text-left transition-colors"
        onClick={() => onSelect(entry)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <span className="truncate">{entry.providerName}</span>
            <span className="opacity-40">/</span>
            <span className="truncate">{entry.modelId}</span>
          </div>
          <div
            className={`truncate text-[13px] leading-snug ${hasError ? 'text-destructive' : 'text-foreground/80'}`}
          >
            {preview}
          </div>
          <div className="text-muted-foreground/70 mt-0.5 text-[10px]">
            {new Date(entry.createdAt).toLocaleString()}
            {entry.durationMs !== null && ` · ${entry.durationMs}ms`}
          </div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive absolute top-1/2 right-0.5 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Delete history entry"
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
