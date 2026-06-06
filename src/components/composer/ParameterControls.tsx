import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DEFAULT_EFFORT,
  DEFAULT_VERBOSITY,
} from '@/constants/defaults';

// ─── Parameter documentation ─────────────────────────────────────────────────

const PARAM_INFO: Record<string, string> = {
  temperature:
    'Controls output randomness. 0 = deterministic/greedy. 1 = default. 2 = highly varied. Use the presets below for quick sweeps.',
  'top-p':
    'Nucleus sampling: model only samples from the top-P probability mass. Lower values narrow diversity. Mutually exclusive with Temperature on some providers.',
  'top-k':
    'Limits the sampling pool to the K most-probable tokens. Supported by Anthropic and Gemini models; ignored by OpenAI-compatible APIs.',
  'frequency-penalty':
    'Penalizes tokens proportional to how many times they have already appeared. Positive values reduce repetition; negative values encourage it. Range −2 to 2 (OpenAI). 0 to 2 (Gemini).',
  'presence-penalty':
    'Penalizes any token that has appeared at all, regardless of count. Pushes the model toward new topics. Range −2 to 2 (OpenAI). 0 to 2 (Gemini).',
  'max-tokens': 'Maximum output tokens the model may generate in one response.',
  stream:
    'Receive tokens as they are generated instead of waiting for the full response. Useful for long outputs and latency testing.',
  thinking:
    'Enables extended internal chain-of-thought reasoning before the visible answer. Supported on Claude 3.7+, Gemini thinking models, and GPT-5 series.',
  'budget-tokens':
    'Token budget reserved for internal reasoning steps. Higher budget = deeper analysis, slower response, higher cost.',
  effort:
    'Reasoning effort level for o-series (GPT-5) and Claude Opus 4.7+ models. Higher effort produces more thorough output at greater cost.',
  verbosity:
    'Controls the length and detail of the final response (GPT-5 Responses API).',
};

// ─── Quick temperature presets ───────────────────────────────────────────────

const TEMP_PRESETS = [
  {
    label: 'Determ.',
    value: 0,
    title: 'Deterministic — reproducible, exact outputs (temp = 0)',
  },
  {
    label: 'Balanced',
    value: 0.7,
    title: 'Balanced — good default for most tasks (temp = 0.7)',
  },
  {
    label: 'Creative',
    value: 1.2,
    title: 'Creative — more varied, imaginative responses (temp = 1.2)',
  },
  { label: 'Random', value: 2, title: 'Maximum variance (temp = 2)' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getDisabledReason(
  support: ParamSupport | undefined,
  disabled: boolean,
): string | undefined {
  if (!disabled) return undefined;
  if (support?.supported === false) return support.reason;
  if (support?.supported === 'default-only') return support.reason;
  return 'Not supported by the selected model.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger className="text-muted-foreground/40 hover:text-muted-foreground inline-flex cursor-default items-center">
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M6 5.5v3" stroke="currentColor" strokeLinecap="round" />
            <circle cx="6" cy="3.5" r="0.6" fill="currentColor" />
          </svg>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-60 text-[11px] leading-snug"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-0.5 flex items-center gap-2">
      <span className="text-muted-foreground/50 text-[10px] font-semibold tracking-widest uppercase">
        {children}
      </span>
      <div className="bg-border/50 h-px flex-1" />
    </div>
  );
}

/** Slider + number input combo for continuous parameters. */
function SliderNumberRow({
  label,
  paramKey,
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
  paramKey: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${paramKey}`;
  const info = PARAM_INFO[paramKey];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label
            htmlFor={inputId}
            className={`text-xs whitespace-nowrap ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            title={disabledReason}
          >
            {label}
          </Label>
          {info && <InfoTooltip content={info} />}
        </div>
        <Input
          id={inputId}
          type="number"
          value={value.toFixed(decimals)}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(
              isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed)),
            );
          }}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          title={disabledReason}
          className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => {
          const val = Array.isArray(v) ? v[0] : (v as number);
          if (val !== undefined) onChange(val);
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={`${label} slider`}
      />
      {disabled && disabledReason && (
        <p className="text-muted-foreground/40 text-[10px] leading-tight">
          {disabledReason}
        </p>
      )}
    </div>
  );
}

function SelectRow({
  label,
  paramKey,
  value,
  values,
  onChange,
  disabled = false,
  disabledReason,
}: {
  label: string;
  paramKey: string;
  value: string;
  values: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${paramKey}`;
  const info = PARAM_INFO[paramKey];
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label
            htmlFor={inputId}
            className={`text-xs ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            title={disabledReason}
          >
            {label}
          </Label>
          {info && <InfoTooltip content={info} />}
        </div>
        <Select
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue !== null) onChange(nextValue);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            id={inputId}
            size="sm"
            className="h-6 w-28 font-mono text-[11px] md:text-[11px]"
            title={disabledReason}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {values.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  paramKey,
  checked,
  onChange,
  disabled = false,
  disabledReason,
}: {
  label: string;
  paramKey: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputId = `param-${paramKey}`;
  const info = PARAM_INFO[paramKey];
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-1.5">
        <Label
          htmlFor={inputId}
          className={`text-xs ${disabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
          title={disabledReason}
        >
          {label}
        </Label>
        {info && <InfoTooltip content={info} />}
      </div>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        title={disabledReason}
        className="rounded"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const effort = useComposerStore((s) => s.effort);
  const verbosity = useComposerStore((s) => s.verbosity);
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
  const setEffort = useComposerStore((s) => s.setEffort);
  const setVerbosity = useComposerStore((s) => s.setVerbosity);

  const capabilities = useSelectedModelCapabilities();
  const temperatureSupport = capabilities?.params.temperature;
  const topPSupport = capabilities?.params.topP;
  const topKSupport = capabilities?.params.topK;
  const frequencyPenaltySupport = capabilities?.params.frequencyPenalty;
  const presencePenaltySupport = capabilities?.params.presencePenalty;
  const maxTokensSupport = capabilities?.params.maxTokens;
  const thinkingSupport = capabilities?.params.thinking;
  const effortSupport = capabilities?.params.effort;
  const verbositySupport = capabilities?.params.verbosity;
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
  // Opus 4.7+ has adaptive-only thinking; no budget control in that mode
  const supportsThinkingBudget =
    thinkingSupport?.modes.includes('enabled') ?? false;
  const isAdaptiveThinkingOnly =
    supportsThinking &&
    !supportsThinkingBudget &&
    thinkingSupport?.modes.includes('adaptive');

  // Temperature bounds for presets clamping
  const tempMin = getParamMin(temperatureSupport, 0);
  const tempMax = getParamMax(temperatureSupport, 2);

  function applyTempPreset(preset: (typeof TEMP_PRESETS)[number]) {
    if (!canEditTemperature) return;
    setTemperature(Math.min(tempMax, Math.max(tempMin, preset.value)));
  }

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
    setEffort(effortSupport?.defaultLevel ?? DEFAULT_EFFORT);
    setVerbosity(verbositySupport?.defaultLevel ?? DEFAULT_VERBOSITY);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Sampling ─────────────────────────────────────────────────────── */}
      <SectionHeader>Sampling</SectionHeader>

      {/* Temperature with quick presets */}
      <div className="flex flex-col gap-1.5">
        <SliderNumberRow
          label="Temperature"
          paramKey="temperature"
          value={temperature}
          onChange={setTemperature}
          min={tempMin}
          max={tempMax}
          step={0.01}
          disabled={!canEditTemperature}
          disabledReason={getDisabledReason(
            temperatureSupport,
            !canEditTemperature,
          )}
        />
        {/* Quick presets — hidden when temperature is unsupported */}
        {canEditTemperature && (
          <div className="flex gap-1 pl-0">
            {TEMP_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                title={preset.title}
                onClick={() => applyTempPreset(preset)}
                className={`h-5 flex-1 px-0 text-[10px] transition-colors ${
                  Math.abs(temperature - preset.value) < 0.001
                    ? 'bg-accent border-accent-foreground/20 text-accent-foreground'
                    : ''
                }`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <SliderNumberRow
        label="Top P"
        paramKey="top-p"
        value={topP}
        onChange={setTopP}
        min={getParamMin(topPSupport, 0)}
        max={getParamMax(topPSupport, 1)}
        step={0.01}
        disabled={!canEditTopP}
        disabledReason={getDisabledReason(topPSupport, !canEditTopP)}
      />

      <SliderNumberRow
        label="Top K"
        paramKey="top-k"
        value={topK}
        onChange={setTopK}
        min={getParamMin(topKSupport, 0)}
        max={getParamMax(topKSupport, 500)}
        step={1}
        decimals={0}
        disabled={!canEditTopK}
        disabledReason={getDisabledReason(topKSupport, !canEditTopK)}
      />

      {/* ── Penalties ────────────────────────────────────────────────────── */}
      <SectionHeader>Penalties</SectionHeader>

      <SliderNumberRow
        label="Frequency Penalty"
        paramKey="frequency-penalty"
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

      <SliderNumberRow
        label="Presence Penalty"
        paramKey="presence-penalty"
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

      {/* ── Output ───────────────────────────────────────────────────────── */}
      <SectionHeader>Output</SectionHeader>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <Label
              htmlFor="param-max-tokens"
              className={`text-xs ${!canEditMaxTokens ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
              title={
                !canEditMaxTokens
                  ? 'Max tokens is not supported by the selected model.'
                  : undefined
              }
            >
              Max Tokens
            </Label>
            <InfoTooltip content={PARAM_INFO['max-tokens']} />
          </div>
          <Input
            id="param-max-tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
            className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
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
        {capabilities?.tokenLimits?.output && (
          <p className="text-muted-foreground/40 text-right text-[10px]">
            model limit: {capabilities.tokenLimits.output.toLocaleString()}
          </p>
        )}
      </div>

      <CheckboxRow
        label="Stream"
        paramKey="stream"
        checked={stream && supportsStreaming}
        onChange={setStream}
        disabled={!supportsStreaming}
        disabledReason={
          !supportsStreaming
            ? 'Streaming is not supported by the selected model.'
            : undefined
        }
      />

      {/* ── Advanced ─────────────────────────────────────────────────────── */}
      <SectionHeader>Advanced</SectionHeader>

      <CheckboxRow
        label="Thinking"
        paramKey="thinking"
        checked={thinkingEnabled}
        onChange={setThinkingEnabled}
        disabled={!supportsThinking}
        disabledReason={
          !supportsThinking
            ? 'Thinking controls are not supported by the selected model.'
            : undefined
        }
      />

      {/* Budget tokens — only when thinking is enabled and the model supports a manual budget */}
      {supportsThinking && supportsThinkingBudget && thinkingEnabled && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <Label
              htmlFor="param-budget-tokens"
              className="text-muted-foreground text-xs"
            >
              Budget Tokens
            </Label>
            <InfoTooltip content={PARAM_INFO['budget-tokens']} />
          </div>
          <Input
            id="param-budget-tokens"
            type="number"
            value={thinkingBudgetTokens}
            onChange={(e) =>
              setThinkingBudgetTokens(
                Math.max(1024, parseInt(e.target.value, 10) || 1024),
              )
            }
            className="h-6 w-20 font-mono text-[11px] md:text-[11px]"
            min={1024}
            max={capabilities?.tokenLimits?.output ?? 1000000}
            step={1024}
          />
        </div>
      )}

      {/* Adaptive-only models (Opus 4.7+): show informational note instead of budget */}
      {supportsThinking && isAdaptiveThinkingOnly && thinkingEnabled && (
        <p className="text-muted-foreground/60 text-[11px]">
          This model uses adaptive thinking — the reasoning depth is set
          automatically.
        </p>
      )}

      {effortSupport && (
        <SelectRow
          label="Effort"
          paramKey="effort"
          value={
            effortSupport.levels.includes(effort)
              ? effort
              : effortSupport.defaultLevel
          }
          values={effortSupport.levels}
          onChange={setEffort}
        />
      )}

      {verbositySupport && (
        <SelectRow
          label="Verbosity"
          paramKey="verbosity"
          value={
            verbositySupport.levels.includes(verbosity)
              ? verbosity
              : verbositySupport.defaultLevel
          }
          values={verbositySupport.levels}
          onChange={setVerbosity}
        />
      )}

      {/* Model quirks — surface compatibility notes to aid testing */}
      {capabilities?.quirks && capabilities.quirks.length > 0 && (
        <div className="border-border/50 mt-1 rounded border p-2">
          <p className="text-muted-foreground/60 mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Model notes
          </p>
          <ul className="text-muted-foreground/70 flex flex-col gap-0.5 text-[11px]">
            {capabilities.quirks.map((q) => (
              <li key={q} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">·</span>
                {q}
              </li>
            ))}
          </ul>
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
