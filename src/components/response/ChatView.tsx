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
            <div className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase">
              sys
            </div>
            <div className="bg-muted/40 text-muted-foreground flex-1 rounded-md px-3 py-2 text-[13px] italic">
              {systemPrompt}
            </div>
          </div>
        )}

        {messages
          .filter(
            (m) =>
              m.content.trim() || (m.attachments && m.attachments.length > 0),
          )
          .map((msg) => (
            <div
              key={msg.id ?? `${msg.role}-${msg.content.slice(0, 32)}`}
              className="flex gap-3"
            >
              <div className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase">
                {msg.role === 'user'
                  ? 'you'
                  : msg.role === 'assistant'
                    ? 'ai'
                    : 'sys'}
              </div>
              <div
                className={`flex-1 rounded-md px-3 py-2 text-[13px] ${
                  msg.role === 'user'
                    ? 'bg-foreground/[0.04]'
                    : msg.role === 'assistant'
                      ? 'bg-muted/40'
                      : 'bg-muted/30 text-muted-foreground italic'
                }`}
              >
                {msg.content}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
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
            <div className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase">
              ai
            </div>
            <div className="bg-muted/40 flex-1 rounded-md px-3 py-2 text-[13px]">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {displayContent && (
          <div className="flex gap-3">
            <div className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase">
              ai
            </div>
            <div className="bg-muted/40 prose prose-sm dark:prose-invert prose-pre:bg-foreground/[0.03] dark:prose-pre:bg-foreground/[0.06] prose-pre:border prose-pre:rounded-md prose-pre:p-3 prose-code:text-xs max-w-none flex-1 rounded-md px-3 py-2 text-[13px]">
              <Markdown>{displayContent}</Markdown>
              {isStreaming && <StreamingIndicator />}
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <div className="text-destructive w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase">
              err
            </div>
            <div className="bg-destructive/5 border-destructive/15 text-destructive flex-1 rounded-md border px-3 py-2 text-[13px]">
              <div className="font-medium">{error}</div>
              {errorDetail && (
                <div className="text-destructive/90 mt-1 font-mono text-[12px] break-words whitespace-pre-wrap">
                  {errorDetail}
                </div>
              )}
              {rawResponse && (
                <pre className="text-destructive/80 bg-destructive/5 mt-2 max-h-48 overflow-auto rounded p-2 font-mono text-[11px] break-words whitespace-pre-wrap">
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
