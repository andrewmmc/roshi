import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <TabsList className="h-7">
          <TabsTrigger value="chat" className="text-xs h-6 px-2.5">Chat</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs h-6 px-2.5">Raw</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isLoading && (
            <span className="animate-pulse">
              {isStreaming ? 'Streaming...' : 'Sending...'}
            </span>
          )}
          {durationMs !== null && !isLoading && (
            <span className="font-mono">{durationMs}ms</span>
          )}
          {response?.usage && (
            <span className="font-mono">{response.usage.totalTokens} tok</span>
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
    </Tabs>
  );
}
