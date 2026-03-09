import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useRequestStore } from '@/stores/request-store';

export function ParameterControls() {
  const temperature = useRequestStore((s) => s.temperature);
  const maxTokens = useRequestStore((s) => s.maxTokens);
  const stream = useRequestStore((s) => s.stream);
  const setTemperature = useRequestStore((s) => s.setTemperature);
  const setMaxTokens = useRequestStore((s) => s.setMaxTokens);
  const setStream = useRequestStore((s) => s.setStream);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">
          Temperature: {temperature.toFixed(2)}
        </Label>
        <Slider
          value={[temperature]}
          onValueChange={(val) => {
            const v = Array.isArray(val) ? val[0] : val;
            setTemperature(v);
          }}
          min={0}
          max={2}
          step={0.01}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Max Tokens</Label>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
          className="w-[120px] h-8 text-sm"
          min={1}
          max={1000000}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer pb-1">
        <input
          type="checkbox"
          checked={stream}
          onChange={(e) => setStream(e.target.checked)}
          className="rounded"
        />
        <span className="text-xs text-muted-foreground">Stream</span>
      </label>
    </div>
  );
}
