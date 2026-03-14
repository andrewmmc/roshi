import { useState } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const json = data ? JSON.stringify(data, null, 2) : '';

  if (!data) {
    return (
      <div className="p-4 text-[13px] text-muted-foreground italic">No {label} data available</div>
    );
  }

  return (
    <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all text-foreground/80">
      {json}
    </pre>
  );
}

function CopyButton({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const json = data ? JSON.stringify(data, null, 2) : '';

  const handleCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-3 h-6 w-6 z-10 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      disabled={!data}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function RawJsonView() {
  const rawRequest = useRequestStore((s) => s.rawRequest);
  const rawResponse = useRequestStore((s) => s.rawResponse);

  return (
    <Tabs defaultValue="response" className="h-full flex flex-col">
      <TabsList className="mx-4 mt-2 self-start h-7">
        <TabsTrigger value="response" className="text-xs h-6 px-2.5">Response</TabsTrigger>
        <TabsTrigger value="request" className="text-xs h-6 px-2.5">Request</TabsTrigger>
      </TabsList>
      <TabsContent value="response" className="relative flex-1 min-h-0 mt-0">
        <CopyButton data={rawResponse} />
        <ScrollArea className="h-full">
          <JsonBlock data={rawResponse} label="response" />
        </ScrollArea>
      </TabsContent>
      <TabsContent value="request" className="relative flex-1 min-h-0 mt-0">
        <CopyButton data={rawRequest} />
        <ScrollArea className="h-full">
          <JsonBlock data={rawRequest} label="request" />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
