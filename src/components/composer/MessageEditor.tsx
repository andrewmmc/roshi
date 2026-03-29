import { useRef, useState } from 'react';
import { Plus, Trash2, Paperclip, Link } from 'lucide-react';
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
import { AttachmentChip } from '@/components/ui/attachment-chip';
import { useRequestStore } from '@/stores/request-store';
import type { NormalizedMessage } from '@/types/normalized';

function AttachmentChips({ messageIndex }: { messageIndex: number }) {
  const attachments = useRequestStore((s) => s.messages[messageIndex]?.attachments);
  const removeAttachment = useRequestStore((s) => s.removeAttachment);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
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
  const messages = useRequestStore((s) => s.messages);
  const updateMessage = useRequestStore((s) => s.updateMessage);
  const removeMessage = useRequestStore((s) => s.removeMessage);
  const addMessage = useRequestStore((s) => s.addMessage);
  const addAttachment = useRequestStore((s) => s.addAttachment);
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const [urlInputIndex, setUrlInputIndex] = useState<number | null>(null);
  const [urlValue, setUrlValue] = useState('');

  const handleRoleChange = (index: number, role: NormalizedMessage['role']) => {
    updateMessage(index, { ...messages[index], role });
  };

  const handleContentChange = (index: number, content: string) => {
    updateMessage(index, { ...messages[index], content });
  };

  const handleAddMessage = () => {
    const lastRole = messages[messages.length - 1]?.role;
    const nextRole: NormalizedMessage['role'] = lastRole === 'user' ? 'assistant' : 'user';
    addMessage({ role: nextRole, content: '' });
  };

  const handleFileSelect = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      addAttachment(index, {
        id: nanoid(),
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        data: dataUri,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (index: number) => {
    const url = urlValue.trim();
    if (!url) return;
    const filename = url.split('/').pop()?.split('?')[0] || 'document.pdf';
    addAttachment(index, {
      id: nanoid(),
      filename,
      mimeType: 'application/pdf',
      data: url,
    });
    setUrlInputIndex(null);
    setUrlValue('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className="flex gap-2 items-start">
            <Select
              value={msg.role}
              onValueChange={(val) => handleRoleChange(index, val as NormalizedMessage['role'])}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs shrink-0 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 min-w-0">
              <Textarea
                value={msg.content}
                onChange={(e) => handleContentChange(index, e.target.value)}
                placeholder={`${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)} message...`}
                className="min-h-[52px] resize-y text-[13px] font-mono bg-muted/30 border-border/60"
                rows={2}
              />
              <AttachmentChips messageIndex={index} />
              {urlInputIndex === index && (
                <div className="flex gap-1.5 mt-1.5">
                  <Input
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUrlSubmit(index);
                      if (e.key === 'Escape') { setUrlInputIndex(null); setUrlValue(''); }
                    }}
                    placeholder="https://example.com/document.pdf"
                    className="h-7 text-xs font-mono flex-1"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleUrlSubmit(index)}
                    disabled={!urlValue.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={() => { setUrlInputIndex(null); setUrlValue(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRefs.current.get(index)?.click()}
                title="Attach file"
                aria-label="Attach file"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
              <input
                ref={(el) => {
                  if (el) fileInputRefs.current.set(index, el);
                  else fileInputRefs.current.delete(index);
                }}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(index, file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setUrlInputIndex(urlInputIndex === index ? null : index);
                  setUrlValue('');
                }}
                title="Attach URL"
                aria-label="Attach URL"
              >
                <Link className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeMessage(index)}
                disabled={messages.length <= 1}
                aria-label="Remove message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="self-start h-7 text-xs" onClick={handleAddMessage}>
        <Plus className="h-3 w-3 mr-1.5" />
        Add Message
      </Button>
    </div>
  );
}
