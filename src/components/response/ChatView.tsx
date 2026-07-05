import { useRef, useEffect, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { useResponseStore } from '@/stores/response-store';
import { StreamingIndicator } from './StreamingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttachmentChip } from '@/components/ui/attachment-chip';
import { CopyButton } from '@/components/ui/copy-button';
import { cn, getRoleLabel, getRoleAriaLabel } from '@/lib/utils';

const ROLE_LABEL_BASE =
  'w-14 shrink-0 pt-1.5 text-right text-[11px] font-medium tracking-wide uppercase';

function MessageRow({
  label,
  ariaLabel,
  labelClassName,
  children,
}: {
  label: string;
  ariaLabel: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div
        aria-label={ariaLabel}
        className={cn(
          ROLE_LABEL_BASE,
          labelClassName ?? 'text-muted-foreground',
        )}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

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
  const compatibilityWarnings = useResponseStore(
    (s) => s.compatibilityWarnings,
  );

  const displayContent = isStreaming ? streamingContent : response?.content;
  const isInterrupted =
    error === 'Response interrupted' && Boolean(displayContent);
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
          <MessageRow label="sys" ariaLabel="System">
            <div className="bg-muted/30 text-muted-foreground flex-1 rounded-lg px-3 py-2 text-[13px] italic select-text">
              {systemPrompt}
            </div>
          </MessageRow>
        )}

        {messages
          .filter(
            (m) =>
              m.content.trim() || (m.attachments && m.attachments.length > 0),
          )
          .map((msg) => (
            <MessageRow
              key={msg.id}
              label={getRoleLabel(msg.role)}
              ariaLabel={getRoleAriaLabel(msg.role)}
            >
              <div
                className={cn(
                  'relative flex-1 rounded-lg px-3 py-2 text-[13px] select-text',
                  msg.role === 'user'
                    ? 'bg-muted/30'
                    : msg.role === 'assistant'
                      ? 'bg-muted/40'
                      : 'bg-muted/30 text-muted-foreground italic',
                )}
              >
                {msg.role === 'user' && msg.content && (
                  <CopyButton
                    text={msg.content}
                    className="absolute top-1 right-1 z-10"
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
            </MessageRow>
          ))}

        {compatibilityWarnings.length > 0 && (
          <MessageRow
            label="warn"
            ariaLabel="Warning"
            labelClassName="text-amber-600 dark:text-amber-400"
          >
            <div className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-100">
              <div className="font-medium">
                Request adjusted for model compatibility
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {compatibilityWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </MessageRow>
        )}

        {showLoading && (
          <MessageRow
            label={getRoleLabel('assistant')}
            ariaLabel={getRoleAriaLabel('assistant')}
          >
            <div className="bg-muted/40 flex-1 rounded-lg px-3 py-2 text-[13px]">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          </MessageRow>
        )}

        {displayContent && (
          <MessageRow
            label={getRoleLabel('assistant')}
            ariaLabel={getRoleAriaLabel('assistant')}
          >
            <div className="bg-muted/40 prose prose-sm dark:prose-invert prose-pre:bg-foreground/[0.03] dark:prose-pre:bg-foreground/[0.06] prose-pre:border prose-pre:rounded-md prose-pre:p-3 prose-code:text-xs relative max-w-none flex-1 rounded-lg px-3 py-2 text-[13px] select-text">
              {!isStreaming && (
                <CopyButton
                  text={displayContent}
                  className="absolute top-1 right-1 z-10"
                  shortcut={{ mac: '⌥C', win: 'Alt+C' }}
                />
              )}
              <Markdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {displayContent}
              </Markdown>
              {isStreaming && <StreamingIndicator />}
            </div>
          </MessageRow>
        )}

        {isInterrupted && (
          <MessageRow
            label="warn"
            ariaLabel="Warning"
            labelClassName="text-amber-600 dark:text-amber-400"
          >
            <div
              role="alert"
              className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-100"
            >
              <div className="font-medium">Response interrupted</div>
              {errorDetail && (
                <div className="mt-1 font-mono text-xs break-words whitespace-pre-wrap">
                  {errorDetail}
                </div>
              )}
              {rawResponse && (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-amber-500/5 p-2 font-mono text-[11px] break-words whitespace-pre-wrap">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              )}
            </div>
          </MessageRow>
        )}

        {error && !isInterrupted && (
          <MessageRow
            label="err"
            ariaLabel="Error"
            labelClassName="text-destructive"
          >
            <div
              role="alert"
              className="bg-destructive/5 border-destructive/15 text-destructive flex-1 rounded-lg border px-3 py-2 text-[13px]"
            >
              <div className="font-medium">{error}</div>
              {errorDetail && (
                <div className="text-destructive/90 mt-1 font-mono text-xs break-words whitespace-pre-wrap">
                  {errorDetail}
                </div>
              )}
              {rawResponse && (
                <pre className="text-destructive/80 bg-destructive/5 mt-2 max-h-48 overflow-auto rounded p-2 font-mono text-[11px] break-words whitespace-pre-wrap">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              )}
            </div>
          </MessageRow>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
