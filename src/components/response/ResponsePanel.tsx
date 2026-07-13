import { lazy, Suspense, useState } from 'react';
import { Download } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconButton } from '@/components/ui/icon-button';
import { PanelHeader } from '@/components/ui/panel-header';
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

type ResponseTab = 'chat' | 'raw' | 'headers' | 'code';

interface RetainedTabs {
  snapshot: ReturnType<typeof useResponseStore.getState>['sentRequest'];
  visited: ReadonlySet<ResponseTab>;
}

const EMPTY_TABS: ReadonlySet<ResponseTab> = new Set();

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

  const [activeTab, setActiveTab] = useState<ResponseTab>('chat');
  const [retention, setRetention] = useState<RetainedTabs>(() => ({
    snapshot: sentRequest,
    visited: EMPTY_TABS,
  }));
  const busy = isLoading || isStreaming;
  const retained =
    !busy && retention.snapshot === sentRequest
      ? retention.visited
      : EMPTY_TABS;

  const handleTabChange = (value: string) => {
    const nextTab = value as ResponseTab;
    setActiveTab(nextTab);

    setRetention((current) => {
      if (busy) {
        if (current.snapshot === sentRequest && current.visited.size === 0) {
          return current;
        }

        return { snapshot: sentRequest, visited: EMPTY_TABS };
      }

      const visited =
        current.snapshot === sentRequest
          ? new Set(current.visited)
          : new Set<ResponseTab>();
      visited.add(activeTab);
      visited.add(nextTab);
      return { snapshot: sentRequest, visited };
    });
  };

  const shouldRenderTab = (tab: ResponseTab) =>
    tab === activeTab || retained.has(tab);

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
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full flex-col"
    >
      <PanelHeader className="justify-between">
        <TabsList
          variant="line"
          className="h-7 gap-0"
          aria-label="Response views"
        >
          <TabsTrigger value="chat" className="px-3 text-xs">
            Chat
          </TabsTrigger>
          <TabsTrigger value="raw" className="px-3 text-xs">
            Body
          </TabsTrigger>
          <TabsTrigger value="headers" className="px-3 text-xs">
            Headers
          </TabsTrigger>
          <TabsTrigger value="code" className="px-3 text-xs">
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
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              tooltip="Export request and response as JSON"
              onClick={() => exportCurrentRequest(useResponseStore.getState())}
            >
              <Download className="h-3.5 w-3.5" />
            </IconButton>
          )}
        </div>
      </PanelHeader>

      <div className="sr-only" aria-live="polite" role="status">
        {statusText}
      </div>

      {shouldRenderTab('chat') && (
        <TabsContent
          value="chat"
          keepMounted
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
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
      )}

      {shouldRenderTab('raw') && (
        <TabsContent
          value="raw"
          keepMounted
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
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
      )}

      {shouldRenderTab('headers') && (
        <TabsContent
          value="headers"
          keepMounted
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
      )}

      {shouldRenderTab('code') && (
        <TabsContent
          value="code"
          keepMounted
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
          <ErrorBoundary panel>
            <Suspense fallback={<TabLoadingFallback />}>
              <CodeView isActive={activeTab === 'code'} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>
      )}
    </Tabs>
  );
}
