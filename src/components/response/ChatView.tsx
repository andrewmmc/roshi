import Markdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useRequestStore } from '@/stores/request-store';
import { StreamingIndicator } from './StreamingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttachmentChip } from '@/components/ui/attachment-chip';

export function ChatView() {
  const sentRequest = useRequestStore((s) => s.sentRequest);
  const messages = sentRequest?.messages ?? [];
  const systemPrompt = sentRequest?.systemPrompt ?? '';
  const response = useRequestStore((s) => s.response);
  const isLoading = useRequestStore((s) => s.isLoading);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const streamingContent = useRequestStore((s) => s.streamingContent);
  const error = useRequestStore((s) => s.error);
  const errorDetail = useRequestStore((s) => s.errorDetail);
  const rawResponse = useRequestStore((s) => s.rawResponse);

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
          .filter((m) => m.content.trim() || (m.attachments && m.attachments.length > 0))
          .map((msg) => (
            <div key={msg.id ?? `${msg.role}-${msg.content.slice(0, 32)}`} className="flex gap-3">
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
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {msg.attachments.map((att) => (
                      <AttachmentChip key={att.id} attachment={att} />
                    ))}
                  </div>
                )}
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
            <div className="flex-1 rounded-md bg-muted/40 px-3 py-2 text-[13px] prose prose-sm dark:prose-invert max-w-none prose-pre:bg-foreground/[0.03] dark:prose-pre:bg-foreground/[0.06] prose-pre:border prose-pre:rounded-md prose-pre:p-3 prose-code:text-xs">
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
            <div className="flex-1 rounded-md bg-destructive/5 border border-destructive/15 px-3 py-2 text-[13px] text-destructive">
              <div className="font-medium">{error}</div>
              {errorDetail && (
                <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] text-destructive/90">
                  {errorDetail}
                </div>
              )}
              {rawResponse && (
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-destructive/80 bg-destructive/5 rounded p-2 overflow-auto max-h-48">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
