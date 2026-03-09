import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderSelect } from './ProviderSelect';
import { MessageEditor } from './MessageEditor';
import { ParameterControls } from './ParameterControls';
import { HeaderEditor } from './HeaderEditor';
import { useRequestStore } from '@/stores/request-store';
import { useSendRequest } from '@/hooks/use-send-request';
import { useProviderStore } from '@/stores/provider-store';
import { ScrollArea } from '@/components/ui/scroll-area';

export function RequestComposer() {
  const isLoading = useRequestStore((s) => s.isLoading);
  const { send, cancel } = useSendRequest();
  const hasProvider = useProviderStore((s) => s.providers.length > 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isLoading && hasProvider) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
        <ProviderSelect />
        {isLoading ? (
          <Button variant="destructive" size="sm" onClick={cancel}>
            <Square className="h-3.5 w-3.5 mr-1.5" />
            Stop
          </Button>
        ) : (
          <Button size="sm" onClick={send} disabled={!hasProvider}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send
            <kbd className="ml-2 text-[10px] opacity-60 hidden sm:inline">⌘↵</kbd>
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          <MessageEditor />
          <ParameterControls />
          <HeaderEditor />
        </div>
      </ScrollArea>
    </div>
  );
}
