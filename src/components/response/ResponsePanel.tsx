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
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation();
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
      {t('loading')}
    </div>
  );
}

export function ResponsePanel() {
  const { t } = useTranslation();
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
  const hasHttpError = statusCode !== null && statusCode >= 400;

  const responseState = isLoading
    ? isStreaming
      ? t('streaming')
      : t('sending')
    : isInterrupted
      ? t('interrupted')
      : error || hasHttpError
        ? t('error')
        : response
          ? t('complete')
          : null;

  const responseStateClass = isLoading
    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
    : isInterrupted
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : error || hasHttpError
        ? 'bg-red-500/10 text-red-700 dark:text-red-300'
        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';

  const statusText = isLoading
    ? isStreaming
      ? t('streamingResponse')
      : t('sendingRequest')
    : isInterrupted
      ? t('responseInterrupted')
      : error
        ? `Error: ${error}`
        : response
          ? t('responseComplete')
          : '';

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full min-w-0 flex-col"
    >
      <PanelHeader className="h-auto min-h-11 flex-wrap justify-between gap-x-3 gap-y-1 py-1.5">
        <div className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <TabsList
            variant="line"
            className="h-7 w-max max-w-none gap-0"
            aria-label={t('responseViews')}
          >
            <TabsTrigger value="chat" className="px-3 text-xs">
              {t('chat')}
            </TabsTrigger>
            <TabsTrigger value="raw" className="px-3 text-xs">
              {t('body')}
            </TabsTrigger>
            <TabsTrigger value="headers" className="px-3 text-xs">
              {t('headers')}
            </TabsTrigger>
            <TabsTrigger value="code" className="px-3 text-xs">
              {t('code')}
            </TabsTrigger>
          </TabsList>
        </div>
        {(responseState ||
          response?.usage ||
          (statusCode !== null && !isLoading) ||
          (durationMs !== null && !isLoading)) && (
          <div
            role="group"
            aria-label={t('responseDetails')}
            className="text-muted-foreground flex min-w-0 shrink-0 items-center gap-1.5 text-[11px] max-sm:order-2 max-sm:w-full max-sm:border-t max-sm:pt-1.5"
          >
            {responseState && (
              <span
                className={cn(
                  'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 font-medium',
                  responseStateClass,
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full bg-current',
                    isLoading && 'animate-pulse motion-reduce:animate-none',
                  )}
                  aria-hidden="true"
                />
                {responseState}
              </span>
            )}
            {statusCode !== null && !isLoading && (
              <span
                className={cn(
                  'shrink-0 font-mono font-medium tabular-nums',
                  isInterrupted
                    ? 'text-amber-600 dark:text-amber-400'
                    : statusCode >= 200 && statusCode < 300
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400',
                )}
                aria-label={t('httpStatus', { status: statusCode })}
              >
                HTTP {statusCode}
              </span>
            )}
            {durationMs !== null && !isLoading && (
              <span
                className="shrink-0 font-mono tabular-nums"
                aria-label={t('latency', { duration: durationMs })}
              >
                {durationMs} ms
              </span>
            )}
            {response?.usage && (
              <span
                className="shrink-0 font-mono tabular-nums"
                aria-label={t('totalTokens', {
                  count: response.usage.totalTokens,
                })}
              >
                {t('tokens', {
                  count: formatCount(response.usage.totalTokens),
                })}
              </span>
            )}
            {statusCode !== null && !isLoading && (
              <IconButton
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground ml-auto shrink-0"
                tooltip={t('exportRequestResponse')}
                onClick={() =>
                  exportCurrentRequest(useResponseStore.getState())
                }
              >
                <Download className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        )}
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
