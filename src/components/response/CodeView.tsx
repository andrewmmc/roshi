import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { useSelectedProvider, useSelectedModel } from '@/stores/provider-store';
import { getCodeGenerators } from '@/services/codegen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);

const highlighterStyle = {
  margin: 0,
  padding: '1rem',
  fontSize: '0.75rem',
  lineHeight: '1.625',
  background: 'transparent',
  borderRadius: 0,
} as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    if (!mountedRef.current) return;
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

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
            className="h-6 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              background: stream ? 'hsl(var(--accent))' : 'transparent',
              color: stream ? 'hsl(var(--accent-foreground))' : 'hsl(var(--muted-foreground))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {stream ? 'stream' : 'sync'}
          </button>
        </div>
        <CopyButton text={codeMap[activeTab] || ''} />
      </div>
      {generators.map((gen) => (
        <TabsContent key={gen.label} value={gen.label} className="relative flex-1 min-h-0 mt-0 overflow-y-auto">
          <SyntaxHighlighter
            language={gen.language}
            style={oneLight}
            customStyle={highlighterStyle}
            wrapLongLines
          >
            {codeMap[gen.label] ?? ''}
          </SyntaxHighlighter>
        </TabsContent>
      ))}
    </Tabs>
  );
}
