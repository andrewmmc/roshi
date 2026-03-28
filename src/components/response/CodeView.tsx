import { useMemo, useState } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { useSelectedProvider, useSelectedModel } from '@/stores/provider-store';
import { getCodeGenerators } from '@/services/codegen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

export function CodeView() {
  const provider = useSelectedProvider();
  const model = useSelectedModel();

  const messages = useRequestStore((s) => s.messages);
  const systemPrompt = useRequestStore((s) => s.systemPrompt);
  const temperature = useRequestStore((s) => s.temperature);
  const maxTokens = useRequestStore((s) => s.maxTokens);
  const streamDefault = useRequestStore((s) => s.stream);
  const [overrideStream, setOverrideStream] = useState<boolean | null>(null);
  const stream = overrideStream ?? streamDefault;

  const toggleStream = () => setOverrideStream((prev) => (prev === null ? !streamDefault : !prev));

  const generators = useMemo(
    () => (provider ? getCodeGenerators(provider) : []),
    [provider],
  );
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const activeTab =
    selectedTab && generators.some((gen) => gen.label === selectedTab)
      ? selectedTab
      : (generators[0]?.label ?? '');

  const codeMap = useMemo(() => {
    if (!provider || !model) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const gen of generators) {
      map[gen.label] = gen.generate({
        provider,
        model: model.id,
        messages: messages.filter((m) => m.content.trim()),
        systemPrompt,
        temperature,
        maxTokens,
        stream,
      });
    }
    return map;
  }, [provider, model, messages, systemPrompt, temperature, maxTokens, stream, generators]);

  if (!provider || !model) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
        Select a provider and model to see code
      </div>
    );
  }

  if (generators.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
        Code generation is not available for this provider type
      </div>
    );
  }

  const hasMessages = messages.some((m) => m.content.trim());

  if (!hasMessages) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
        Enter a message to see code
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 mt-2">
        <div className="flex items-center gap-2">
          <TabsList className="h-7">
            {generators.map((gen) => (
              <TabsTrigger key={gen.label} value={gen.label} className="text-xs h-6 px-2.5">
                {gen.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            type="button"
            onClick={toggleStream}
            className={cn(
              'h-6 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer border border-border',
              stream
                ? 'bg-accent text-accent-foreground'
                : 'bg-transparent text-muted-foreground',
            )}
          >
            {stream ? 'stream' : 'sync'}
          </button>
        </div>
        <CopyButton text={codeMap[activeTab] || ''} />
      </div>
      {generators.map((gen) => (
        <TabsContent key={gen.label} value={gen.label} className="relative flex-1 min-h-0 mt-0 overflow-y-auto">
          <pre className="h-full p-4 m-0 text-[13px] leading-relaxed overflow-x-auto">
            <code className="text-xs font-mono">{codeMap[gen.label] ?? ''}</code>
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
