import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageEditor } from './MessageEditor';
import { ParameterControls } from './ParameterControls';
import { HeaderEditor } from './HeaderEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useComposerStore } from '@/stores/composer-store';
import { useUiStore } from '@/stores/ui-store';

export function RequestComposer() {
  const systemPrompt = useComposerStore((s) => s.systemPrompt);
  const setSystemPrompt = useComposerStore((s) => s.setSystemPrompt);
  const messages = useComposerStore((s) => s.messages);
  const setMainView = useUiStore((s) => s.setMainView);
  const hasCustomHeaders = useComposerStore((s) =>
    s.customHeaders.some((h) => h.key.trim() !== ''),
  );
  const composerIsEmpty =
    !systemPrompt.trim() &&
    messages.every(
      (message) =>
        !message.content.trim() &&
        !(message.attachments && message.attachments.length > 0),
    );

  return (
    <Tabs defaultValue="messages" className="flex h-full flex-col gap-0">
      <div className="border-border/70 flex h-10 shrink-0 items-center border-b px-3">
        <TabsList variant="line" className="h-7 gap-0">
          <TabsTrigger value="messages" className="px-3 text-xs">
            Messages
          </TabsTrigger>
          <TabsTrigger value="system" className="px-3 text-xs">
            System Prompt
            {systemPrompt.trim() && (
              <span className="bg-primary ml-1 inline-block h-1.5 w-1.5 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="headers" className="px-3 text-xs">
            Headers
            {hasCustomHeaders && (
              <span className="bg-primary ml-1 inline-block h-1.5 w-1.5 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="parameters" className="px-3 text-xs">
            Parameters
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="messages" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {composerIsEmpty && (
              <div className="border-border/60 bg-muted/15 mb-4 rounded-md border px-3 py-2.5">
                <p className="text-muted-foreground text-[11px]">
                  Need a starting point? Browse starter templates in
                  Collections, or compare this prompt across models in Eval.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setMainView('eval')}
                  >
                    Open Eval
                  </Button>
                </div>
              </div>
            )}
            <MessageEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="system" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              aria-label="System prompt"
              placeholder="System prompt (optional)"
              className="bg-muted/20 border-border/50 min-h-[80px] resize-y font-mono text-[12px] md:text-[12px]"
              rows={3}
            />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="headers" className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <HeaderEditor />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent
        value="parameters"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ScrollArea className="h-full">
          <div className="p-4">
            <ParameterControls />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
