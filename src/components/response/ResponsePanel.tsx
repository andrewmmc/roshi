import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatView } from './ChatView';
import { RawJsonView } from './RawJsonView';
import { CodeView } from './CodeView';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';

export function ResponsePanel() {
  const isLoading = useRequestStore((s) => s.isLoading);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const response = useRequestStore((s) => s.response);
  const error = useRequestStore((s) => s.error);
  const durationMs = useRequestStore((s) => s.durationMs);
  const statusCode = useRequestStore((s) => s.statusCode);

  const selectedProvider = useProviderStore((s) => {
    const id = s.selectedProviderId;
    return id ? s.providers.find((p) => p.id === id) || null : null;
  });
  const isCodeTabEnabled = selectedProvider
    ? selectedProvider.type === 'openai-compatible' || selectedProvider.type === 'custom'
    : false;

  const hasContent = response || error || isStreaming || isLoading;

  return (
    <Tabs defaultValue="chat" className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <TabsList className="h-7">
          <TabsTrigger value="chat" className="text-xs h-6 px-2.5">Chat</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs h-6 px-2.5">Raw</TabsTrigger>
          <TabsTrigger value="code" className="text-xs h-6 px-2.5" disabled={!isCodeTabEnabled}>
            Code
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      <TabsContent value="chat" className="flex-1 min-h-0 mt-0 overflow-hidden">
        {hasContent ? (
          <ChatView />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
            Send a request to see the response
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="flex-1 min-h-0 mt-0 overflow-hidden">
        {hasContent ? (
          <RawJsonView />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
            Send a request to see raw JSON
          </div>
        )}
      </TabsContent>

      <TabsContent value="code" className="flex-1 min-h-0 mt-0 overflow-hidden">
        <CodeView />
      </TabsContent>
    </Tabs>
  );
}
