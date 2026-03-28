import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRequestStore } from '@/stores/request-store';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
} from '@/constants/defaults';

function NumberInputRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  decimals = 2,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs text-muted-foreground w-32 shrink-0">{label}</Label>
      <Input
        type="number"
        value={value.toFixed(decimals)}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed)));
        }}
        step={step}
        min={min}
        max={max}
        className="w-24 h-7 text-xs font-mono"
      />
    </div>
  );
}

export function ParameterControls() {
  const temperature = useRequestStore((s) => s.temperature);
  const maxTokens = useRequestStore((s) => s.maxTokens);
  const topP = useRequestStore((s) => s.topP);
  const frequencyPenalty = useRequestStore((s) => s.frequencyPenalty);
  const presencePenalty = useRequestStore((s) => s.presencePenalty);
  const stream = useRequestStore((s) => s.stream);
  const setTemperature = useRequestStore((s) => s.setTemperature);
  const setMaxTokens = useRequestStore((s) => s.setMaxTokens);
  const setTopP = useRequestStore((s) => s.setTopP);
  const setFrequencyPenalty = useRequestStore((s) => s.setFrequencyPenalty);
  const setPresencePenalty = useRequestStore((s) => s.setPresencePenalty);
  const setStream = useRequestStore((s) => s.setStream);

  const reset = () => {
    setTemperature(DEFAULT_TEMPERATURE);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setTopP(DEFAULT_TOP_P);
    setFrequencyPenalty(DEFAULT_FREQUENCY_PENALTY);
    setPresencePenalty(DEFAULT_PRESENCE_PENALTY);
    setStream(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <NumberInputRow
        label="Temperature"
        value={temperature}
        onChange={setTemperature}
        min={0}
        max={2}
        step={0.01}
      />
      <NumberInputRow
        label="Top P"
        value={topP}
        onChange={setTopP}
        min={0}
        max={1}
        step={0.01}
      />
      <NumberInputRow
        label="Frequency Penalty"
        value={frequencyPenalty}
        onChange={setFrequencyPenalty}
        min={0}
        max={2}
        step={0.01}
      />
      <NumberInputRow
        label="Presence Penalty"
        value={presencePenalty}
        onChange={setPresencePenalty}
        min={0}
        max={2}
        step={0.01}
      />

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-32 shrink-0">Max Tokens</Label>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
          className="w-24 h-7 text-xs font-mono"
          min={1}
          max={1000000}
        />
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-32 shrink-0">Stream</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stream}
            onChange={(e) => setStream(e.target.checked)}
            className="rounded"
          />
        </label>
      </div>

      <div className="flex justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
