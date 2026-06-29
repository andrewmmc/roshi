import { lazy, Suspense } from 'react';
import { Download } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconButton } from '@/components/ui/icon-button';
import { useResponseStore } from '@/stores/response-store';
import { formatCount } from '@/utils/format';
import { exportCurrentRequest } from '@/utils/export';
import { ResponseEmptyState } from '@/components/onboarding/ResponseEmptyState';

const ChatView = lazy(() =>
  import('./ChatView').then((m) => ({ default: m.ChatView })),
);
const RawJsonView = lazy(() =>
  import('./RawJsonView').then((m) => ({ default: m.RawJsonView })),
);
const HeadersView = lazy(() =>
  import('./HeadersView').then((m) => ({ default: m.HeadersView })),
);
const CodeView = lazy(() =>
  import('./CodeView').then((m) => ({ default: m.CodeView })),
);

function TabLoadingFallback() {
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
      Loading…
    </div>
  );
}

export function ResponsePanel() {
  const isLoading = useResponseStore((s) => s.isLoading);
  const isStreaming = useResponseStore((s) => s.isStreaming);
  const response = useResponseStore((s) => s.response);
  const error = useResponseStore((s) => s.error);
  const durationMs = useResponseStore((s) => s.durationMs);
  const statusCode = useResponseStore((s) => s.statusCode);
  const sentRequest = useResponseStore((s) => s.sentRequest);
  const rawRequest = useResponseStore((s) => s.rawRequest);
  const rawResponse = useResponseStore((s) => s.rawResponse);
  const requestUrl = useResponseStore((s) => s.requestUrl);
  const requestHeaders = useResponseStore((s) => s.requestHeaders);
  const responseHeaders = useResponseStore((s) => s.responseHeaders);

  const hasContent = response || error || isStreaming || isLoading;
  const isInterrupted =
    error === 'Response interrupted' && Boolean(response?.content);

  const statusText = isLoading
    ? isStreaming
      ? 'Streaming response...'
      : 'Sending request...'
    : isInterrupted
      ? 'Response interrupted'
      : error
        ? `Error: ${error}`
        : response
          ? 'Response complete'
          : '';

  return (
    <Tabs defaultValue="chat" className="flex h-full flex-col">
      <div className="border-border/70 flex h-11 shrink-0 items-center justify-between border-b px-4">
        <TabsList className="h-7">
          <TabsTrigger value="chat" className="h-6 px-2.5 text-xs">
            Chat
          </TabsTrigger>
          <TabsTrigger value="raw" className="h-6 px-2.5 text-xs">
            Body
          </TabsTrigger>
          <TabsTrigger value="headers" className="h-6 px-2.5 text-xs">
            Headers
          </TabsTrigger>
          <TabsTrigger value="code" className="h-6 px-2.5 text-xs">
            Code
          </TabsTrigger>
        </TabsList>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {isLoading && (
            <span className="animate-pulse">
              {isStreaming ? 'Streaming...' : 'Sending...'}
            </span>
          )}
          {response?.usage && (
            <span className="font-mono">
              {formatCount(response.usage.totalTokens)} tokens
            </span>
          )}
          {statusCode !== null && !isLoading && (
            <span
              className={`font-mono font-medium ${
                isInterrupted
                  ? 'text-amber-600 dark:text-amber-400'
                  : statusCode >= 200 && statusCode < 300
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {statusCode}{' '}
              {isInterrupted
                ? 'Interrupted'
                : statusCode < 300
                  ? 'Success'
                  : 'Error'}
            </span>
          )}
          {durationMs !== null && !isLoading && (
            <span className="font-mono">{durationMs}ms</span>
          )}
          {statusCode !== null && !isLoading && (
            <IconButton
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-7 w-7"
              tooltip="Export request and response as JSON"
              onClick={() =>
                exportCurrentRequest({
                  sentRequest,
                  response,
                  rawRequest,
                  rawResponse,
                  requestUrl,
                  requestHeaders,
                  responseHeaders,
                  error,
                  durationMs,
                  statusCode,
                })
              }
            >
              <Download className="h-3 w-3" />
            </IconButton>
          )}
        </div>
      </div>

      <div className="sr-only" aria-live="polite" role="status">
        {statusText}
      </div>

      <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
        {hasContent ? (
          <ErrorBoundary panel>
            <Suspense fallback={<TabLoadingFallback />}>
              <ChatView />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <ResponseEmptyState />
        )}
      </TabsContent>

      <TabsContent value="raw" className="mt-0 min-h-0 flex-1 overflow-hidden">
        {hasContent ? (
          <ErrorBoundary panel>
            <Suspense fallback={<TabLoadingFallback />}>
              <RawJsonView />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <ResponseEmptyState />
        )}
      </TabsContent>

      <TabsContent
        value="headers"
        className="mt-0 min-h-0 flex-1 overflow-hidden"
      >
        {hasContent ? (
          <ErrorBoundary panel>
            <Suspense fallback={<TabLoadingFallback />}>
              <HeadersView />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <ResponseEmptyState />
        )}
      </TabsContent>

      <TabsContent value="code" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <ErrorBoundary panel>
          <Suspense fallback={<TabLoadingFallback />}>
            <CodeView />
          </Suspense>
        </ErrorBoundary>
      </TabsContent>
    </Tabs>
  );
}
