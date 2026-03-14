import Markdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useRequestStore } from '@/stores/request-store';
import { StreamingIndicator } from './StreamingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatView() {
  const messages = useRequestStore((s) => s.messages);
  const systemPrompt = useRequestStore((s) => s.systemPrompt);
  const response = useRequestStore((s) => s.response);
  const isLoading = useRequestStore((s) => s.isLoading);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const streamingContent = useRequestStore((s) => s.streamingContent);
  const error = useRequestStore((s) => s.error);

  const displayContent = isStreaming ? streamingContent : response?.content;
  const showLoading = isLoading && !displayContent;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4">
        {systemPrompt && (
          <div className="flex gap-3">
            <div className="shrink-0 w-14 pt-1.5 text-[11px] font-medium text-muted-foreground text-right uppercase tracking-wide">
              sys
            </div>
            <div className="flex-1 rounded-md bg-muted/40 px-3 py-2 text-[13px] italic text-muted-foreground">
              {systemPrompt}
            </div>
          </div>
        )}

        {messages
          .filter((m) => m.content.trim())
          .map((msg, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 w-14 pt-1.5 text-[11px] font-medium text-muted-foreground text-right uppercase tracking-wide">
                {msg.role === 'user' ? 'you' : msg.role === 'assistant' ? 'ai' : 'sys'}
              </div>
              <div
                className={`flex-1 rounded-md px-3 py-2 text-[13px] ${
                  msg.role === 'user'
                    ? 'bg-foreground/[0.04]'
                    : msg.role === 'assistant'
                      ? 'bg-muted/40'
                      : 'bg-muted/30 italic text-muted-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

        {showLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-14 pt-1.5 text-[11px] font-medium text-muted-foreground text-right uppercase tracking-wide">
              ai
            </div>
            <div className="flex-1 rounded-md bg-muted/40 px-3 py-2 text-[13px]">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {displayContent && (
          <div className="flex gap-3">
            <div className="shrink-0 w-14 pt-1.5 text-[11px] font-medium text-muted-foreground text-right uppercase tracking-wide">
              ai
            </div>
            <div className="flex-1 rounded-md bg-muted/40 px-3 py-2 text-[13px] prose prose-sm max-w-none prose-pre:bg-foreground/[0.03] prose-pre:border prose-pre:rounded-md prose-pre:p-3 prose-code:text-xs">
              <Markdown>{displayContent}</Markdown>
              {isStreaming && <StreamingIndicator />}
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <div className="shrink-0 w-14 pt-1.5 text-[11px] font-medium text-destructive text-right uppercase tracking-wide">
              err
            </div>
            <div className="flex-1 rounded-md bg-destructive/5 border border-destructive/15 px-3 py-2 text-[13px] text-destructive font-mono break-all">
              {error}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
