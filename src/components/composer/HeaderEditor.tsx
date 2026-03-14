import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRequestStore } from '@/stores/request-store';

export function HeaderEditor() {
  const customHeaders = useRequestStore((s) => s.customHeaders);
  const setCustomHeaders = useRequestStore((s) => s.setCustomHeaders);

  const entries = Object.entries(customHeaders);

  const addHeader = () => {
    setCustomHeaders({ ...customHeaders, '': '' });
  };

  const updateKey = (oldKey: string, newKey: string) => {
    const newHeaders = { ...customHeaders };
    const value = newHeaders[oldKey];
    delete newHeaders[oldKey];
    newHeaders[newKey] = value;
    setCustomHeaders(newHeaders);
  };

  const updateValue = (key: string, value: string) => {
    setCustomHeaders({ ...customHeaders, [key]: value });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...customHeaders };
    delete newHeaders[key];
    setCustomHeaders(newHeaders);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">No custom headers.</p>
      )}
      {entries.map(([key, value], index) => (
        <div key={index} className="flex gap-2 items-center">
          <Input
            value={key}
            onChange={(e) => updateKey(key, e.target.value)}
            placeholder="Header name"
            className="h-7 text-xs font-mono flex-1"
          />
          <Input
            value={value}
            onChange={(e) => updateValue(key, e.target.value)}
            placeholder="Header value"
            className="h-7 text-xs font-mono flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeHeader(key)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="self-start h-7 text-xs" onClick={addHeader}>
        <Plus className="h-3 w-3 mr-1.5" />
        Add Header
      </Button>
    </div>
  );
}
