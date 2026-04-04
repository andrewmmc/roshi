import { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Paperclip, Link, Ellipsis, Eraser } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { nanoid } from 'nanoid';
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
import { AttachmentChip } from '@/components/ui/attachment-chip';
import { useComposerStore } from '@/stores/composer-store';
import { guessMimeType, SUPPORTED_FILE_ACCEPT } from '@/utils/mime';
import type { NormalizedMessage } from '@/types/normalized';

function AttachmentChips({ messageIndex }: { messageIndex: number }) {
  const attachments = useComposerStore(
    (s) => s.messages[messageIndex]?.attachments,
  );
  const removeAttachment = useComposerStore((s) => s.removeAttachment);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att) => (
        <AttachmentChip
          key={att.id}
          attachment={att}
          onRemove={() => removeAttachment(messageIndex, att.id)}
        />
      ))}
    </div>
  );
}

export function MessageEditor() {
  const messages = useComposerStore((s) => s.messages);
  const updateMessage = useComposerStore((s) => s.updateMessage);
  const removeMessage = useComposerStore((s) => s.removeMessage);
  const addMessage = useComposerStore((s) => s.addMessage);
  const addAttachment = useComposerStore((s) => s.addAttachment);
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const addMessageBtnRef = useRef<HTMLButtonElement>(null);
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
      removeMessage(index);
    }
  };

  const scrollGeneration = useComposerStore((s) => s.scrollGeneration);

  // Auto-focus and scroll to the last user message when an assistant message is appended
  useEffect(() => {
    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];
    const prevMsg = messages[lastIndex - 1];
    if (
      lastMsg?.role === 'user' &&
      lastMsg.content === '' &&
      prevMsg?.role === 'assistant' &&
      prevMsg.content !== ''
    ) {
      const textarea = textareaRefs.current.get(lastIndex);
      if (textarea) {
        textarea.focus();
      }
      addMessageBtnRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [messages]);

  // Scroll to bottom of message list when history entry is loaded
  useEffect(() => {
    if (scrollGeneration === 0) return;
    addMessageBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [scrollGeneration]);

  const handleRoleChange = (index: number, role: NormalizedMessage['role']) => {
    updateMessage(index, { ...messages[index], role });
  };

  const handleContentChange = (index: number, content: string) => {
    updateMessage(index, { ...messages[index], content });
  };

  const handleAddMessage = () => {
    const lastRole = messages[messages.length - 1]?.role;
    const nextRole: NormalizedMessage['role'] =
      lastRole === 'user' ? 'assistant' : 'user';
    addMessage({ role: nextRole, content: '' });
  };

  const handleFileSelect = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      addAttachment(index, {
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
    addAttachment(index, {
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
          <div key={msg.id || index} className="flex items-start gap-2">
            <Select
              value={msg.role}
              onValueChange={(val) =>
                handleRoleChange(index, val as NormalizedMessage['role'])
              }
            >
              <SelectTrigger className="h-7 w-[100px] shrink-0 text-xs capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
            <div className="min-w-0 flex-1">
              <Textarea
                ref={(el) => {
                  if (el) textareaRefs.current.set(index, el);
                  else textareaRefs.current.delete(index);
                }}
                value={msg.content}
                onChange={(e) => handleContentChange(index, e.target.value)}
                placeholder={`${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)} message...`}
                className="bg-muted/20 border-border/50 min-h-[52px] resize-y font-mono text-[12px] md:text-[12px]"
                rows={2}
              />
              <AttachmentChips messageIndex={index} />
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
                    className="h-7 flex-1 font-mono text-xs"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => handleUrlSubmit(index)}
                    disabled={!urlValue.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
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
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(index, file);
                  e.target.value = '';
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Message options"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/70 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
                >
                  <Ellipsis className="h-4 w-4" />
                </DropdownMenuTrigger>
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
        ref={addMessageBtnRef}
        variant="outline"
        size="sm"
        className="h-7 self-start text-xs"
        onClick={handleAddMessage}
      >
        <Plus className="mr-1.5 h-3 w-3" />
        Add Message
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
                    updateMessage(confirmAction.index, {
                      ...messages[confirmAction.index],
                      content: '',
                      attachments: [],
                    });
                  } else {
                    removeMessage(confirmAction.index);
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
