import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useComposerStore } from '@/stores/composer-store';
import { useSelectedProvider } from '@/stores/provider-store';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_THINKING_ENABLED,
  DEFAULT_THINKING_BUDGET_TOKENS,
} from '@/constants/defaults';

function NumberInputRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  decimals = 2,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
}) {
  const inputId = `param-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex items-center gap-3">
      <Label
        htmlFor={inputId}
        className={`w-32 shrink-0 text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
      >
        {label}
      </Label>
      <Input
        id={inputId}
        type="number"
        value={value.toFixed(decimals)}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed)));
        }}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className="h-7 w-24 font-mono text-[12px] md:text-[12px]"
      />
    </div>
  );
}

export function ParameterControls() {
  const temperature = useComposerStore((s) => s.temperature);
  const maxTokens = useComposerStore((s) => s.maxTokens);
  const topP = useComposerStore((s) => s.topP);
  const topK = useComposerStore((s) => s.topK);
  const frequencyPenalty = useComposerStore((s) => s.frequencyPenalty);
  const presencePenalty = useComposerStore((s) => s.presencePenalty);
  const stream = useComposerStore((s) => s.stream);
  const thinkingEnabled = useComposerStore((s) => s.thinkingEnabled);
  const thinkingBudgetTokens = useComposerStore((s) => s.thinkingBudgetTokens);
  const setTemperature = useComposerStore((s) => s.setTemperature);
  const setMaxTokens = useComposerStore((s) => s.setMaxTokens);
  const setTopP = useComposerStore((s) => s.setTopP);
  const setTopK = useComposerStore((s) => s.setTopK);
  const setFrequencyPenalty = useComposerStore((s) => s.setFrequencyPenalty);
  const setPresencePenalty = useComposerStore((s) => s.setPresencePenalty);
  const setStream = useComposerStore((s) => s.setStream);
  const setThinkingEnabled = useComposerStore((s) => s.setThinkingEnabled);
  const setThinkingBudgetTokens = useComposerStore(
    (s) => s.setThinkingBudgetTokens,
  );

  const selectedProvider = useSelectedProvider();
  const providerType = selectedProvider?.type;
  const isAnthropic = providerType === 'anthropic';
  const supportsTopK =
    providerType === 'anthropic' || providerType === 'google-gemini';
  const supportsThinking =
    providerType === 'anthropic' || providerType === 'google-gemini';

  const reset = () => {
    setTemperature(DEFAULT_TEMPERATURE);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setTopP(DEFAULT_TOP_P);
    setTopK(DEFAULT_TOP_K);
    setFrequencyPenalty(DEFAULT_FREQUENCY_PENALTY);
    setPresencePenalty(DEFAULT_PRESENCE_PENALTY);
    setStream(true);
    setThinkingEnabled(DEFAULT_THINKING_ENABLED);
    setThinkingBudgetTokens(DEFAULT_THINKING_BUDGET_TOKENS);
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
        label="Top K"
        value={topK}
        onChange={setTopK}
        min={0}
        max={500}
        step={1}
        decimals={0}
        disabled={!supportsTopK}
      />
      <NumberInputRow
        label="Frequency Penalty"
        value={frequencyPenalty}
        onChange={setFrequencyPenalty}
        min={0}
        max={2}
        step={0.01}
        disabled={isAnthropic}
      />
      <NumberInputRow
        label="Presence Penalty"
        value={presencePenalty}
        onChange={setPresencePenalty}
        min={0}
        max={2}
        step={0.01}
        disabled={isAnthropic}
      />

      <div className="flex items-center gap-3">
        <Label
          htmlFor="param-max-tokens"
          className="text-muted-foreground w-32 shrink-0 text-xs"
        >
          Max Tokens
        </Label>
        <Input
          id="param-max-tokens"
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
          className="h-7 w-24 font-mono text-[12px] md:text-[12px]"
          min={1}
          max={1000000}
        />
      </div>

      <div className="flex items-center gap-3">
        <Label
          htmlFor="param-stream"
          className="text-muted-foreground w-32 shrink-0 text-xs"
        >
          Stream
        </Label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            id="param-stream"
            type="checkbox"
            checked={stream}
            onChange={(e) => setStream(e.target.checked)}
            className="rounded"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Label
          htmlFor="param-thinking"
          className={`w-32 shrink-0 text-xs ${!supportsThinking ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
        >
          Thinking
        </Label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            id="param-thinking"
            type="checkbox"
            checked={thinkingEnabled}
            onChange={(e) => setThinkingEnabled(e.target.checked)}
            disabled={!supportsThinking}
            className="rounded"
          />
        </label>
      </div>

      {supportsThinking && thinkingEnabled && (
        <div className="flex items-center gap-3">
          <Label
            htmlFor="param-budget-tokens"
            className="text-muted-foreground w-32 shrink-0 text-xs"
          >
            Budget Tokens
          </Label>
          <Input
            id="param-budget-tokens"
            type="number"
            value={thinkingBudgetTokens}
            onChange={(e) =>
              setThinkingBudgetTokens(
                Math.max(1024, parseInt(e.target.value, 10) || 1024),
              )
            }
            className="h-7 w-24 font-mono text-[12px] md:text-[12px]"
            min={1024}
            max={1000000}
            step={1024}
          />
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="h-7 text-xs"
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
