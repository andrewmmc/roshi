import { FileText, Image, X } from 'lucide-react';
import { isImageMimeType } from '@/utils/mime';
import type { MessageAttachment } from '@/types/normalized';

interface AttachmentChipProps {
  attachment: MessageAttachment;
  onRemove?: () => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const Icon = isImageMimeType(attachment.mimeType) ? Image : FileText;

  return (
    <span className="bg-muted/60 border-border/50 text-muted-foreground inline-flex max-w-[200px] items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px]">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{attachment.filename}</span>
      {onRemove && (
        <button
          type="button"
          className="hover:text-destructive shrink-0 transition-colors"
          onClick={onRemove}
          aria-label={`Remove ${attachment.filename}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
