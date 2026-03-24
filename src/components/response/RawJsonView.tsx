import { useState, useRef, useCallback, useEffect } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';

SyntaxHighlighter.registerLanguage('json', json);

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const jsonStr = data ? JSON.stringify(data, null, 2) : '';

  if (!data) {
    return (
      <div className="p-4 text-[13px] text-muted-foreground italic">No {label} data available</div>
    );
  }

  return (
    <SyntaxHighlighter
      language="json"
      style={oneLight}
      customStyle={{
        margin: 0,
        padding: '1rem',
        fontSize: '0.75rem',
        lineHeight: '1.625',
        background: 'transparent',
        borderRadius: 0,
      }}
      wrapLongLines
    >
      {jsonStr}
    </SyntaxHighlighter>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
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
      disabled={!text}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function RawJsonView() {
  const rawRequest = useRequestStore((s) => s.rawRequest);
  const rawResponse = useRequestStore((s) => s.rawResponse);

  const [activeTab, setActiveTab] = useState('response');
  const activeData = activeTab === 'response' ? rawResponse : rawRequest;
  const activeJson = activeData ? JSON.stringify(activeData, null, 2) : '';

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 mt-2">
        <TabsList className="h-7">
          <TabsTrigger value="response" className="text-xs h-6 px-2.5">Response</TabsTrigger>
          <TabsTrigger value="request" className="text-xs h-6 px-2.5">Request</TabsTrigger>
        </TabsList>
        <CopyButton text={activeJson} />
      </div>
      <TabsContent value="response" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <JsonBlock data={rawResponse} label="response" />
      </TabsContent>
      <TabsContent value="request" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <JsonBlock data={rawRequest} label="request" />
      </TabsContent>
    </Tabs>
  );
}
