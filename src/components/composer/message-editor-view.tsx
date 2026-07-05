import { useRef, useState, type Ref } from 'react';
import { nanoid } from 'nanoid';
import { Plus, Trash2, Paperclip, Link, Ellipsis, Eraser } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AttachmentChip } from '@/components/ui/attachment-chip';
import { guessMimeType, SUPPORTED_FILE_ACCEPT } from '@/utils/mime';
import type { MessageAttachment, NormalizedMessage } from '@/types/normalized';

/**
 * Shared row-level message list editor used by both the Request composer
 * and the Eval composer. Consumers own the underlying store; this component
 * only renders UI and calls back for every mutation.
 */
export interface MessageEditorViewProps {
  messages: NormalizedMessage[];
  disabled?: boolean;
  onUpdateMessage: (index: number, patch: Partial<NormalizedMessage>) => void;
  onRemoveMessage: (index: number) => void;
  onAddMessage: () => void;
  onAddAttachment: (index: number, attachment: MessageAttachment) => void;
  onRemoveAttachment: (index: number, attachmentId: string) => void;
  /** Lets a parent track textarea nodes for auto-focus/scroll behavior. */
  registerTextarea?: (index: number, el: HTMLTextAreaElement | null) => void;
  addMessageButtonRef?: Ref<HTMLButtonElement>;
}

function AttachmentChips({
  attachments,
  onRemove,
}: {
  attachments?: MessageAttachment[];
  onRemove: (attachmentId: string) => void;
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att) => (
        <AttachmentChip
          key={att.id}
          attachment={att}
          onRemove={() => onRemove(att.id)}
        />
      ))}
    </div>
  );
}

export function MessageEditorView({
  messages,
  disabled = false,
  onUpdateMessage,
  onRemoveMessage,
  onAddMessage,
  onAddAttachment,
  onRemoveAttachment,
  registerTextarea,
  addMessageButtonRef,
}: MessageEditorViewProps) {
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const [urlInputIndex, setUrlInputIndex] = useState<number | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'clear' | 'delete';
    index: number;
  } | null>(null);

  const handleClearMessage = (index: number) => {
    setConfirmAction({ type: 'clear', index });
  };

  const handleRemoveMessage = (index: number) => {
    const msg = messages[index];
    const hasContent = msg.content.trim() !== '';
    const hasAttachments = (msg.attachments?.length ?? 0) > 0;
    if (hasContent || hasAttachments) {
      setConfirmAction({ type: 'delete', index });
    } else {
      onRemoveMessage(index);
    }
  };

  const handleRoleChange = (index: number, role: NormalizedMessage['role']) => {
    onUpdateMessage(index, { role });
  };

  const handleContentChange = (index: number, content: string) => {
    onUpdateMessage(index, { content });
  };

  const handleFileSelect = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      onAddAttachment(index, {
        id: nanoid(),
        filename: file.name,
        mimeType: file.type || guessMimeType(file.name),
        data: dataUri,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (index: number) => {
    const url = urlValue.trim();
    if (!url) return;
    const filename = url.split('/').pop()?.split('?')[0] || 'file';
    onAddAttachment(index, {
      id: nanoid(),
      filename,
      mimeType: guessMimeType(url),
      data: url,
    });
    setUrlInputIndex(null);
    setUrlValue('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.map((msg, index) => (
          <div key={msg.id ?? index} className="flex items-start gap-2">
            <Select
              value={msg.role}
              onValueChange={(val) => {
                if (!val) return;
                handleRoleChange(index, val as NormalizedMessage['role']);
              }}
              disabled={disabled}
            >
              <SelectTrigger
                aria-label={`Role for message ${index + 1}`}
                className="h-7 w-[100px] shrink-0 text-xs"
              >
                <SelectValue>
                  {msg.role === 'user'
                    ? 'User'
                    : msg.role === 'assistant'
                      ? 'Assistant'
                      : msg.role}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
            <div className="min-w-0 flex-1">
              <Textarea
                ref={(el) => registerTextarea?.(index, el)}
                value={msg.content}
                onChange={(e) => handleContentChange(index, e.target.value)}
                disabled={disabled}
                aria-label={`${msg.role} message ${index + 1}`}
                placeholder={`${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)} message...`}
                className="bg-muted/20 border-border/50 min-h-[52px] resize-y font-mono text-xs"
                rows={2}
              />
              <AttachmentChips
                attachments={msg.attachments}
                onRemove={(attachmentId) =>
                  onRemoveAttachment(index, attachmentId)
                }
              />
              {urlInputIndex === index && (
                <div className="mt-1.5 flex gap-1.5">
                  <Input
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUrlSubmit(index);
                      if (e.key === 'Escape') {
                        setUrlInputIndex(null);
                        setUrlValue('');
                      }
                    }}
                    placeholder="https://example.com/image.png"
                    className="flex-1 font-mono text-xs"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleUrlSubmit(index)}
                    disabled={!urlValue.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setUrlInputIndex(null);
                      setUrlValue('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="shrink-0">
              <input
                ref={(el) => {
                  if (el) fileInputRefs.current.set(index, el);
                  else fileInputRefs.current.delete(index);
                }}
                type="file"
                accept={SUPPORTED_FILE_ACCEPT}
                aria-label={`Attach file to message ${index + 1}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(index, file);
                  e.target.value = '';
                }}
              />
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <DropdownMenuTrigger
                          aria-label="Message options"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/70 inline-flex size-7 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),12px)] transition-colors"
                        />
                      }
                    >
                      <Ellipsis className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>Message options</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  className="min-w-40"
                >
                  <DropdownMenuItem
                    onClick={() => fileInputRefs.current.get(index)?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach file
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setUrlInputIndex(urlInputIndex === index ? null : index);
                      setUrlValue('');
                    }}
                  >
                    <Link className="h-3.5 w-3.5" />
                    Attach URL
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleClearMessage(index)}
                    disabled={
                      !messages[index].content.trim() &&
                      !(messages[index].attachments?.length ?? 0)
                    }
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Clear message
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleRemoveMessage(index)}
                    disabled={messages.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete message
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <Button
        ref={addMessageButtonRef}
        variant="outline"
        size="sm"
        className="self-start"
        onClick={onAddMessage}
        disabled={disabled}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add message
      </Button>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'clear'
                ? 'Clear message?'
                : 'Delete message?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'clear'
                ? 'This will clear all content and attachments from this message.'
                : 'This message has content that will be lost. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmAction) {
                  if (confirmAction.type === 'clear') {
                    onUpdateMessage(confirmAction.index, {
                      content: '',
                      attachments: [],
                    });
                  } else {
                    onRemoveMessage(confirmAction.index);
                  }
                }
                setConfirmAction(null);
              }}
            >
              {confirmAction?.type === 'clear' ? 'Clear' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
