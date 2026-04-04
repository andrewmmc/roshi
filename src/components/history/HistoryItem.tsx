import { Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import type { HistoryEntry } from '@/types/history';

interface HistoryItemProps {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

export function HistoryItem({ entry, onSelect, onDelete }: HistoryItemProps) {
  const lastUserMessage = [...entry.request.messages]
    .reverse()
    .find((m) => m.role === 'user' && m.content.trim());
  const preview = lastUserMessage?.content.slice(0, 80) || 'No message';
  const hasError = !!entry.error;

  return (
    <div className="group relative">
      <button
        className="hover:bg-sidebar-accent/70 w-full rounded px-2.5 py-1.5 pr-9 text-left transition-colors"
        onClick={() => onSelect(entry)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <span className="truncate">{entry.providerName}</span>
            {entry.modelId && <span className="opacity-40">/</span>}
            {entry.modelId && <span className="truncate">{entry.modelId}</span>}
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
      <IconButton
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive absolute top-1/2 right-0.5 h-7 w-7 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
        tooltip="Delete history entry"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(entry.id);
        }}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </IconButton>
    </div>
  );
}
