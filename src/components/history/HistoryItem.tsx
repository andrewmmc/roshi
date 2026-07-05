import { Trash2, Download, Check, MoreHorizontal } from 'lucide-react';
import { SidebarRow } from '@/components/ui/sidebar-row';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportHistoryEntry } from '@/utils/export';
import { formatRelativeTime } from '@/utils/relative-time';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';

const TRIGGER_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

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
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="History entry actions"
            className={TRIGGER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-40">
            <DropdownMenuItem onClick={() => exportHistoryEntry(entry)}>
              <Download className="h-3.5 w-3.5" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      <div className="min-w-0 flex-1 pr-8">
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
          <span title={new Date(entry.createdAt).toLocaleString()}>
            {formatRelativeTime(entry.createdAt)}
          </span>
          {entry.durationMs !== null && ` · ${entry.durationMs}ms`}
        </div>
      </div>
    </SidebarRow>
  );
}
