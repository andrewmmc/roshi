import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './ChatView';
import { RawJsonView } from './RawJsonView';
import { CodeView } from './CodeView';
import { useRequestStore } from '@/stores/request-store';
import { useSelectedProvider } from '@/stores/provider-store';

export function ResponsePanel() {
  const isLoading = useRequestStore((s) => s.isLoading);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const response = useRequestStore((s) => s.response);
  const error = useRequestStore((s) => s.error);
  const durationMs = useRequestStore((s) => s.durationMs);
  const statusCode = useRequestStore((s) => s.statusCode);

  const selectedProvider = useSelectedProvider();
  const isCodeTabEnabled = selectedProvider
    ? selectedProvider.type === 'openai-compatible' ||
      selectedProvider.type === 'custom'
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
            Raw
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
            <span className="font-mono">{response.usage.totalTokens} tok</span>
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
          <ChatView />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
            Send a request to see the response
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="mt-0 min-h-0 flex-1 overflow-hidden">
        {hasContent ? (
          <RawJsonView />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
            Send a request to see raw JSON
          </div>
        )}
      </TabsContent>

      <TabsContent value="code" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <CodeView />
      </TabsContent>
    </Tabs>
  );
}
