import { useState, useCallback, useRef, memo, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconButton } from '@/components/ui/icon-button';
import { useResponseStore } from '@/stores/response-store';
import { toast } from '@/stores/toast-store';
import { exportHeadersJson } from '@/utils/export';

function CopyableCell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast('Copied to clipboard');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <td className={`px-3 py-1 align-top ${className ?? ''}`}>
      <button
        type="button"
        className="hover:bg-muted/50 -mx-1 -my-0.5 block w-[calc(100%+0.5rem)] cursor-pointer rounded px-1 py-0.5 text-left break-all transition-colors"
        onClick={handleClick}
        title="Click to copy"
      >
        {copied ? (
          <span className="text-xs text-green-600">Copied!</span>
        ) : (
          value
        )}
      </button>
    </td>
  );
}

const HeadersTable = memo(function HeadersTable({
  headers,
}: {
  headers: Record<string, string> | null;
}) {
  if (!headers || Object.keys(headers).length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-[13px] italic">
        No headers available
      </div>
    );
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
          <tr key={key} className="border-border/40 border-b last:border-0">
            <CopyableCell
              value={key}
              className="text-muted-foreground w-1/3 align-top"
            />
            <CopyableCell value={value} />
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
        <TabsList className="h-7">
          <TabsTrigger value="response" className="h-6 px-2.5 text-xs">
            Response
          </TabsTrigger>
          <TabsTrigger value="request" className="h-6 px-2.5 text-xs">
            Request
          </TabsTrigger>
        </TabsList>
        <IconButton
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-7 w-7"
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
          <Download className="h-3 w-3" />
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
