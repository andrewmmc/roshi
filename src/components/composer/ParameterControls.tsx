import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useComposerStore } from '@/stores/composer-store';
import { useSelectedModelCapabilities } from '@/stores/provider-store';
import type { ParamSupport } from '@/models/capabilities';
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

function isParamEditable(
  support: ParamSupport | undefined,
  hasCapabilities: boolean,
  fallback: boolean,
): boolean {
  return hasCapabilities ? support?.supported === true : fallback;
}

function getParamMin(
  support: ParamSupport | undefined,
  fallback: number,
): number {
  return support && support.supported === true && support.min !== undefined
    ? support.min
    : fallback;
}

function getParamMax(
  support: ParamSupport | undefined,
  fallback: number,
): number {
  return support && support.supported === true && support.max !== undefined
    ? support.max
    : fallback;
}

function labelClassName(disabled: boolean): string {
  return `w-32 shrink-0 text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`;
}

function getDisabledReason(
  support: ParamSupport | undefined,
  disabled: boolean,
): string | undefined {
  if (!disabled) return undefined;
  if (support?.supported === false) return support.reason;
  if (support?.supported === 'default-only') return support.reason;
  return 'This control is not supported by the selected model.';
}

function NumberInputRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  decimals = 2,
  disabled = false,
  disabledReason,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex items-center gap-3">
      <Label
        htmlFor={inputId}
        className={`w-32 shrink-0 text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
        title={disabledReason}
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
        title={disabledReason}
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

  const capabilities = useSelectedModelCapabilities();
  const temperatureSupport = capabilities?.params.temperature;
  const topPSupport = capabilities?.params.topP;
  const topKSupport = capabilities?.params.topK;
  const frequencyPenaltySupport = capabilities?.params.frequencyPenalty;
  const presencePenaltySupport = capabilities?.params.presencePenalty;
  const maxTokensSupport = capabilities?.params.maxTokens;
  const thinkingSupport = capabilities?.params.thinking;
  const hasCapabilities = Boolean(capabilities);

  const canEditTemperature = isParamEditable(
    temperatureSupport,
    hasCapabilities,
    true,
  );
  const canEditTopP = isParamEditable(topPSupport, hasCapabilities, true);
  const canEditTopK = isParamEditable(topKSupport, hasCapabilities, false);
  const canEditFrequencyPenalty = isParamEditable(
    frequencyPenaltySupport,
    hasCapabilities,
    true,
  );
  const canEditPresencePenalty = isParamEditable(
    presencePenaltySupport,
    hasCapabilities,
    true,
  );
  const canEditMaxTokens = capabilities
    ? maxTokensSupport?.supported === true
    : true;
  const supportsStreaming = capabilities?.streaming ?? true;
  const supportsThinking = Boolean(thinkingSupport);
  const supportsThinkingBudget =
    thinkingSupport?.modes.includes('enabled') ?? false;

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
        min={getParamMin(temperatureSupport, 0)}
        max={getParamMax(temperatureSupport, 2)}
        step={0.01}
        disabled={!canEditTemperature}
        disabledReason={getDisabledReason(
          temperatureSupport,
          !canEditTemperature,
        )}
      />
      <NumberInputRow
        label="Top P"
        value={topP}
        onChange={setTopP}
        min={getParamMin(topPSupport, 0)}
        max={getParamMax(topPSupport, 1)}
        step={0.01}
        disabled={!canEditTopP}
        disabledReason={getDisabledReason(topPSupport, !canEditTopP)}
      />
      <NumberInputRow
        label="Top K"
        value={topK}
        onChange={setTopK}
        min={getParamMin(topKSupport, 0)}
        max={getParamMax(topKSupport, 500)}
        step={1}
        decimals={0}
        disabled={!canEditTopK}
        disabledReason={getDisabledReason(topKSupport, !canEditTopK)}
      />
      <NumberInputRow
        label="Frequency Penalty"
        value={frequencyPenalty}
        onChange={setFrequencyPenalty}
        min={getParamMin(frequencyPenaltySupport, 0)}
        max={getParamMax(frequencyPenaltySupport, 2)}
        step={0.01}
        disabled={!canEditFrequencyPenalty}
        disabledReason={getDisabledReason(
          frequencyPenaltySupport,
          !canEditFrequencyPenalty,
        )}
      />
      <NumberInputRow
        label="Presence Penalty"
        value={presencePenalty}
        onChange={setPresencePenalty}
        min={getParamMin(presencePenaltySupport, 0)}
        max={getParamMax(presencePenaltySupport, 2)}
        step={0.01}
        disabled={!canEditPresencePenalty}
        disabledReason={getDisabledReason(
          presencePenaltySupport,
          !canEditPresencePenalty,
        )}
      />

      <div className="flex items-center gap-3">
        <Label
          htmlFor="param-max-tokens"
          className={labelClassName(!canEditMaxTokens)}
          title={
            !canEditMaxTokens
              ? 'Max tokens is not supported by the selected model.'
              : undefined
          }
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
          max={capabilities?.tokenLimits?.output ?? 1000000}
          disabled={!canEditMaxTokens}
          title={
            !canEditMaxTokens
              ? 'Max tokens is not supported by the selected model.'
              : undefined
          }
        />
      </div>

      <div className="flex items-center gap-3">
        <Label
          htmlFor="param-stream"
          className={labelClassName(!supportsStreaming)}
          title={
            !supportsStreaming
              ? 'Streaming is not supported by the selected model.'
              : undefined
          }
        >
          Stream
        </Label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            id="param-stream"
            type="checkbox"
            checked={stream && supportsStreaming}
            onChange={(e) => setStream(e.target.checked)}
            disabled={!supportsStreaming}
            title={
              !supportsStreaming
                ? 'Streaming is not supported by the selected model.'
                : undefined
            }
            className="rounded"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Label
          htmlFor="param-thinking"
          className={labelClassName(!supportsThinking)}
          title={
            !supportsThinking
              ? 'Thinking controls are not supported by the selected model.'
              : undefined
          }
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
            title={
              !supportsThinking
                ? 'Thinking controls are not supported by the selected model.'
                : undefined
            }
            className="rounded"
          />
        </label>
      </div>

      {supportsThinking && supportsThinkingBudget && thinkingEnabled && (
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
