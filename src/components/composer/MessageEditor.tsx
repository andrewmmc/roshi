import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequestStore } from '@/stores/request-store';
import type { NormalizedMessage } from '@/types/normalized';

export function MessageEditor() {
  const messages = useRequestStore((s) => s.messages);
  const updateMessage = useRequestStore((s) => s.updateMessage);
  const removeMessage = useRequestStore((s) => s.removeMessage);
  const addMessage = useRequestStore((s) => s.addMessage);

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.map((msg, index) => (
          <div key={index} className="flex gap-2 items-start">
            <Select
              value={msg.role}
              onValueChange={(val) => handleRoleChange(index, val as NormalizedMessage['role'])}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="assistant">assistant</SelectItem>
                <SelectItem value="system">system</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={msg.content}
              onChange={(e) => handleContentChange(index, e.target.value)}
              placeholder={`${msg.role} message...`}
              className="min-h-[52px] resize-y text-[13px] font-mono flex-1 bg-muted/30 border-border/60"
              rows={2}
            />
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeMessage(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
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
