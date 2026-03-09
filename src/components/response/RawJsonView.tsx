import { useState } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) {
    return (
      <div className="p-4 text-sm text-muted-foreground italic">No {label} data available</div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 z-10"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
        {json}
      </pre>
    </div>
  );
}

export function RawJsonView() {
  const rawRequest = useRequestStore((s) => s.rawRequest);
  const rawResponse = useRequestStore((s) => s.rawResponse);

  return (
    <Tabs defaultValue="response" className="h-full flex flex-col">
      <TabsList className="mx-4 mt-2 self-start">
        <TabsTrigger value="response">Response</TabsTrigger>
        <TabsTrigger value="request">Request</TabsTrigger>
      </TabsList>
      <TabsContent value="response" className="flex-1 mt-0">
        <ScrollArea className="h-full">
          <JsonBlock data={rawResponse} label="response" />
        </ScrollArea>
      </TabsContent>
      <TabsContent value="request" className="flex-1 mt-0">
        <ScrollArea className="h-full">
          <JsonBlock data={rawRequest} label="request" />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
