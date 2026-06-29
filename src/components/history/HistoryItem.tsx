import { Trash2, Download, Check } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { SidebarRow } from '@/components/ui/sidebar-row';
import { exportHistoryEntry } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';

interface HistoryItemProps {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  compareMode?: boolean;
  compareSelected?: boolean;
  onToggleCompare?: (id: string) => void;
}

export function HistoryItem({
  entry,
  onSelect,
  onDelete,
  compareMode = false,
  compareSelected = false,
  onToggleCompare,
}: HistoryItemProps) {
  const lastUserMessage = [...entry.request.messages]
    .reverse()
    .find((m) => m.role === 'user' && m.content.trim());
  const preview = lastUserMessage?.content.slice(0, 80) || 'No message';
  const hasError = !!entry.error;

  const handleClick = () => {
    if (compareMode) {
      onToggleCompare?.(entry.id);
      return;
    }
    onSelect(entry);
  };

  return (
    <SidebarRow
      active={compareSelected}
      onClick={handleClick}
      actions={
        <>
          <IconButton
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            tooltip="Export as JSON"
            onClick={(e) => {
              e.stopPropagation();
              exportHistoryEntry(entry);
            }}
          >
            <Download className="h-3 w-3" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive"
            tooltip="Delete history entry"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </IconButton>
        </>
      }
    >
      {compareMode && (
        <span
          className={cn(
            'border-border/70 mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
            compareSelected &&
              'bg-primary border-primary text-primary-foreground',
          )}
          aria-hidden="true"
        >
          {compareSelected ? <Check className="h-2.5 w-2.5" /> : null}
        </span>
      )}
      <div className="min-w-0 flex-1 pr-12">
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
        <div className="text-muted-foreground/70 mt-0.5 text-[11px]">
          {new Date(entry.createdAt).toLocaleString()}
          {entry.durationMs !== null && ` · ${entry.durationMs}ms`}
        </div>
      </div>
    </SidebarRow>
  );
}
