import { memo } from 'react';
import { Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconButton } from '@/components/ui/icon-button';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { useResponseStore } from '@/stores/response-store';
import { exportHeadersJson } from '@/utils/export';

const HeadersTable = memo(function HeadersTable({
  headers,
}: {
  headers: Record<string, string> | null;
}) {
  if (!headers || Object.keys(headers).length === 0) {
    return <EmptyState title="No headers available" compact />;
  }

  return (
    <table className="w-full font-mono text-[13px]">
      <thead>
        <tr className="text-muted-foreground border-b text-left text-xs">
          <th className="w-1/3 px-3 py-1 font-medium">Name</th>
          <th className="px-3 py-1 font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(headers).map(([key, value]) => (
          <tr key={key} className="border-border/50 border-b last:border-0">
            <td className="text-muted-foreground w-1/3 px-3 py-1 align-top">
              <div className="flex items-center justify-between gap-1">
                <span className="break-all">{key}</span>
                <CopyButton text={key} className="shrink-0" />
              </div>
            </td>
            <td className="px-3 py-1 align-top">
              <div className="flex items-center justify-between gap-1">
                <span className="break-all">{value}</span>
                <CopyButton text={value} className="shrink-0" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

export function HeadersView() {
  const requestUrl = useResponseStore((s) => s.requestUrl);
  const requestHeaders = useResponseStore((s) => s.requestHeaders);
  const responseHeaders = useResponseStore((s) => s.responseHeaders);
  const hasHeaders = Boolean(
    (requestHeaders && Object.keys(requestHeaders).length > 0) ||
    (responseHeaders && Object.keys(responseHeaders).length > 0),
  );

  return (
    <Tabs defaultValue="response" className="flex h-full flex-col">
      <div className="mt-2 flex items-center justify-between px-4">
        <TabsList variant="line" className="h-7 gap-0">
          <TabsTrigger value="response" className="px-3 text-xs">
            Response
          </TabsTrigger>
          <TabsTrigger value="request" className="px-3 text-xs">
            Request
          </TabsTrigger>
        </TabsList>
        <IconButton
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          tooltip="Export headers as JSON"
          disabled={!hasHeaders}
          onClick={() =>
            exportHeadersJson({
              requestUrl,
              requestHeaders,
              responseHeaders,
            })
          }
        >
          <Download className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      <TabsContent
        value="response"
        className="mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <HeadersTable headers={responseHeaders} />
      </TabsContent>
      <TabsContent
        value="request"
        className="mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <HeadersTable headers={requestHeaders} />
      </TabsContent>
    </Tabs>
  );
}
