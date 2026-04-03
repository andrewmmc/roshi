import { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResponseStore } from '@/stores/response-store';
import { useSelectedProvider } from '@/stores/provider-store';
import { formatCount } from '@/utils/format';

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

export function ResponsePanel() {
  const isLoading = useResponseStore((s) => s.isLoading);
  const isStreaming = useResponseStore((s) => s.isStreaming);
  const response = useResponseStore((s) => s.response);
  const error = useResponseStore((s) => s.error);
  const durationMs = useResponseStore((s) => s.durationMs);
  const statusCode = useResponseStore((s) => s.statusCode);

  const selectedProvider = useSelectedProvider();
  const isCodeTabEnabled = selectedProvider
    ? selectedProvider.type === 'openai-compatible' ||
      selectedProvider.type === 'custom' ||
      selectedProvider.type === 'anthropic' ||
      selectedProvider.type === 'google-gemini'
    : false;

  const hasContent = response || error || isStreaming || isLoading;

  return (
    <Tabs defaultValue="chat" className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
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
          <TabsTrigger
            value="code"
            className="h-6 px-2.5 text-xs"
            disabled={!isCodeTabEnabled}
          >
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
                statusCode >= 200 && statusCode < 300
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {statusCode} {statusCode < 300 ? 'Success' : 'Error'}
            </span>
          )}
          {durationMs !== null && !isLoading && (
            <span className="font-mono">{durationMs}ms</span>
          )}
        </div>
      </div>

      <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
        {hasContent ? (
          <Suspense>
            <ChatView />
          </Suspense>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
            Send a request to see the response
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="mt-0 min-h-0 flex-1 overflow-hidden">
        {hasContent ? (
          <Suspense>
            <RawJsonView />
          </Suspense>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
            Send a request to see raw JSON
          </div>
        )}
      </TabsContent>

      <TabsContent
        value="headers"
        className="mt-0 min-h-0 flex-1 overflow-hidden"
      >
        {hasContent ? (
          <Suspense>
            <HeadersView />
          </Suspense>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
            Send a request to see headers
          </div>
        )}
      </TabsContent>

      <TabsContent value="code" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <CodeView />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
