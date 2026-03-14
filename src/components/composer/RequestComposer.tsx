import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MessageEditor } from './MessageEditor';
import { ParameterControls } from './ParameterControls';
import { HeaderEditor } from './HeaderEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRequestStore } from '@/stores/request-store';

export function RequestComposer() {
  const systemPrompt = useRequestStore((s) => s.systemPrompt);
  const setSystemPrompt = useRequestStore((s) => s.setSystemPrompt);

  return (
    <Tabs defaultValue="messages" className="h-full flex flex-col gap-0">
      <div className="flex items-center px-4 h-10 border-b shrink-0">
        <TabsList variant="line" className="h-7 gap-0">
          <TabsTrigger value="messages" className="text-xs px-3">Messages</TabsTrigger>
          <TabsTrigger value="system" className="text-xs px-3">System Prompt</TabsTrigger>
          <TabsTrigger value="headers" className="text-xs px-3">Headers</TabsTrigger>
          <TabsTrigger value="parameters" className="text-xs px-3">Parameters</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="messages" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <MessageEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="system" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="System prompt (optional)"
              className="min-h-[80px] resize-y text-[13px] font-mono bg-muted/30 border-border/60"
              rows={3}
            />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="headers" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <HeaderEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="parameters" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <ParameterControls />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
