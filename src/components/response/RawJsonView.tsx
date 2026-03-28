import { useState, useMemo, memo } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';

const JsonBlock = memo(function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const jsonStr = useMemo(() => (data ? JSON.stringify(data, null, 2) : ''), [data]);

  if (!data) {
    return (
      <div className="p-4 text-[13px] text-muted-foreground italic">No {label} data available</div>
    );
  }

  return (
    <pre className="p-4 text-[13px] font-mono whitespace-pre-wrap break-words">
      {jsonStr}
    </pre>
  );
});

export function RawJsonView() {
  const rawRequest = useRequestStore((s) => s.rawRequest);
  const rawResponse = useRequestStore((s) => s.rawResponse);

  const [activeTab, setActiveTab] = useState('response');
  const activeData = activeTab === 'response' ? rawResponse : rawRequest;
  const activeJson = useMemo(
    () => (activeData ? JSON.stringify(activeData, null, 2) : ''),
    [activeData],
  );

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
