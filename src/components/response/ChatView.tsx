import Markdown from 'react-markdown';
import { useRequestStore } from '@/stores/request-store';
import { StreamingIndicator } from './StreamingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatView() {
  const messages = useRequestStore((s) => s.messages);
  const systemPrompt = useRequestStore((s) => s.systemPrompt);
  const response = useRequestStore((s) => s.response);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const streamingContent = useRequestStore((s) => s.streamingContent);
  const error = useRequestStore((s) => s.error);

  const displayContent = isStreaming ? streamingContent : response?.content;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
        {systemPrompt && (
          <div className="flex gap-3">
            <div className="shrink-0 w-16 pt-1 text-xs font-medium text-muted-foreground text-right">
              system
            </div>
            <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 text-sm italic text-muted-foreground">
              {systemPrompt}
            </div>
          </div>
        )}

        {messages
          .filter((m) => m.content.trim())
          .map((msg, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 w-16 pt-1 text-xs font-medium text-muted-foreground text-right">
                {msg.role}
              </div>
              <div
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary/10'
                    : msg.role === 'assistant'
                      ? 'bg-muted/50'
                      : 'bg-muted/30 italic'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

        {displayContent && (
          <div className="flex gap-3">
            <div className="shrink-0 w-16 pt-1 text-xs font-medium text-muted-foreground text-right">
              assistant
            </div>
            <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 text-sm prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:border [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-xs">
              <Markdown>{displayContent}</Markdown>
              {isStreaming && <StreamingIndicator />}
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <div className="shrink-0 w-16 pt-1 text-xs font-medium text-destructive text-right">
              error
            </div>
            <div className="flex-1 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive font-mono break-all">
              {error}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
