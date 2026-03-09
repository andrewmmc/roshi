import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChatView } from './ChatView';
import { RawJsonView } from './RawJsonView';
import { useRequestStore } from '@/stores/request-store';

export function ResponsePanel() {
  const isLoading = useRequestStore((s) => s.isLoading);
  const isStreaming = useRequestStore((s) => s.isStreaming);
  const response = useRequestStore((s) => s.response);
  const error = useRequestStore((s) => s.error);
  const durationMs = useRequestStore((s) => s.durationMs);

  const hasContent = response || error || isStreaming;

  return (
    <Tabs defaultValue="chat" className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              {isStreaming ? 'Streaming...' : 'Sending...'}
            </Badge>
          )}
          {durationMs !== null && !isLoading && (
            <Badge variant="outline" className="text-xs font-mono">
              {durationMs}ms
            </Badge>
          )}
          {response?.usage && (
            <Badge variant="outline" className="text-xs font-mono">
              {response.usage.totalTokens} tokens
            </Badge>
          )}
        </div>
      </div>

      <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
        {hasContent ? (
          <ChatView />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Send a request to see the response
          </div>
        )}
      </TabsContent>

      <TabsContent value="raw" className="flex-1 mt-0 overflow-hidden">
        {hasContent ? (
          <RawJsonView />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Send a request to see raw JSON
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
