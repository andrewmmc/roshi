import { useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useResponseStore } from '@/stores/response-store';
import { StreamingIndicator } from './StreamingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttachmentChip } from '@/components/ui/attachment-chip';
import { CopyButton } from '@/components/ui/copy-button';
import { getRoleLabel, getRoleAriaLabel } from '@/lib/utils';

export function ChatView() {
  const sentRequest = useResponseStore((s) => s.sentRequest);
  const messages = sentRequest?.messages ?? [];
  const systemPrompt = sentRequest?.systemPrompt ?? '';
  const response = useResponseStore((s) => s.response);
  const isLoading = useResponseStore((s) => s.isLoading);
  const isStreaming = useResponseStore((s) => s.isStreaming);
  const streamingContent = useResponseStore((s) => s.streamingContent);
  const error = useResponseStore((s) => s.error);
  const errorDetail = useResponseStore((s) => s.errorDetail);
  const rawResponse = useResponseStore((s) => s.rawResponse);

  const displayContent = isStreaming ? streamingContent : response?.content;
  const showLoading = isLoading && !displayContent;
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when loading starts or response content appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [showLoading, displayContent, error]);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4">
        {systemPrompt && (
          <div className="flex gap-3">
            <div
              aria-label="System"
              className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase"
            >
              sys
            </div>
            <div className="bg-muted/40 text-muted-foreground flex-1 rounded-md px-3 py-2 text-[13px] italic select-text">
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
              <div
                aria-label={getRoleAriaLabel(msg.role)}
                className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase"
              >
                {getRoleLabel(msg.role)}
              </div>
              <div
                className={`relative flex-1 rounded-md px-3 py-2 text-[13px] select-text ${
                  msg.role === 'user'
                    ? 'bg-muted/25'
                    : msg.role === 'assistant'
                      ? 'bg-muted/30'
                      : 'bg-muted/30 text-muted-foreground italic'
                }`}
              >
                {msg.role === 'user' && msg.content && (
                  <CopyButton
                    text={msg.content}
                    className="absolute top-1 right-1"
                  />
                )}
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
            <div
              aria-label={getRoleAriaLabel('assistant')}
              className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase"
            >
              {getRoleLabel('assistant')}
            </div>
            <div className="bg-muted/40 flex-1 rounded-md px-3 py-2 text-[13px]">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {displayContent && (
          <div className="flex gap-3">
            <div
              aria-label={getRoleAriaLabel('assistant')}
              className="text-muted-foreground w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase"
            >
              {getRoleLabel('assistant')}
            </div>
            <div className="bg-muted/40 prose prose-sm dark:prose-invert prose-pre:bg-foreground/[0.03] dark:prose-pre:bg-foreground/[0.06] prose-pre:border prose-pre:rounded-md prose-pre:p-3 prose-code:text-xs relative max-w-none flex-1 rounded-md px-3 py-2 text-[13px] select-text">
              {!isStreaming && (
                <CopyButton
                  text={displayContent}
                  className="absolute top-1 right-1 z-10"
                />
              )}
              <Markdown>{displayContent}</Markdown>
              {isStreaming && <StreamingIndicator />}
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <div
              aria-label="Error"
              className="text-destructive w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase"
            >
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
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
