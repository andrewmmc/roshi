import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRequestStore } from '@/stores/request-store';

export function HeaderEditor() {
  const customHeaders = useRequestStore((s) => s.customHeaders);
  const setCustomHeaders = useRequestStore((s) => s.setCustomHeaders);

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const updateKey = (index: number, key: string) => {
    setCustomHeaders(customHeaders.map((h, i) => (i === index ? { ...h, key } : h)));
  };

  const updateValue = (index: number, value: string) => {
    setCustomHeaders(customHeaders.map((h, i) => (i === index ? { ...h, value } : h)));
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {customHeaders.length === 0 && (
        <p className="text-xs text-muted-foreground">No custom headers.</p>
      )}
      {customHeaders.map((header, index) => (
        <div key={index} className="flex gap-2 items-center">
          <Input
            value={header.key}
            onChange={(e) => updateKey(index, e.target.value)}
            placeholder="Header name"
            className="h-7 text-xs font-mono flex-1"
          />
          <Input
            value={header.value}
            onChange={(e) => updateValue(index, e.target.value)}
            placeholder="Header value"
            className="h-7 text-xs font-mono flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeHeader(index)}
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
