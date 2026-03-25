import { FileText, X } from 'lucide-react';
import type { MessageAttachment } from '@/types/normalized';

interface AttachmentChipProps {
  attachment: MessageAttachment;
  onRemove?: () => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground font-mono max-w-[200px]">
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">{attachment.filename}</span>
      {onRemove && (
        <button
          type="button"
          className="shrink-0 hover:text-destructive transition-colors"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
