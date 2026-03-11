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
      <div className="p-4 text-[13px] text-muted-foreground italic">No {label} data available</div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 z-10 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </Button>
      <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all text-foreground/80">
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
      <TabsList className="mx-4 mt-2 self-start h-7">
        <TabsTrigger value="response" className="text-xs h-6 px-2.5">Response</TabsTrigger>
        <TabsTrigger value="request" className="text-xs h-6 px-2.5">Request</TabsTrigger>
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
