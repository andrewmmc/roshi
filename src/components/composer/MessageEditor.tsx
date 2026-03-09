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
  const systemPrompt = useRequestStore((s) => s.systemPrompt);
  const updateMessage = useRequestStore((s) => s.updateMessage);
  const removeMessage = useRequestStore((s) => s.removeMessage);
  const addMessage = useRequestStore((s) => s.addMessage);
  const setSystemPrompt = useRequestStore((s) => s.setSystemPrompt);

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
      {/* System prompt */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          System Prompt
        </label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter system prompt (optional)"
          className="min-h-[60px] resize-y text-sm font-mono"
          rows={2}
        />
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Messages
        </label>
        {messages.map((msg, index) => (
          <div key={index} className="flex gap-2 items-start">
            <Select
              value={msg.role}
              onValueChange={(val) => handleRoleChange(index, val as NormalizedMessage['role'])}
            >
              <SelectTrigger className="w-[110px] shrink-0">
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
              placeholder={`Enter ${msg.role} message...`}
              className="min-h-[60px] resize-y text-sm font-mono flex-1"
              rows={2}
            />
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeMessage(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="self-start" onClick={handleAddMessage}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Message
      </Button>
    </div>
  );
}
