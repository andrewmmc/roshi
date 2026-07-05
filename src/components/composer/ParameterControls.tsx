import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PARAM_INFO,
  TEMP_PRESETS,
} from '@/components/composer/parameter-control-utils';
import {
  CheckboxRow,
  InfoTooltip,
  SectionHeader,
  SliderNumberRow,
} from '@/components/composer/primitives';
import { useParameterControlsState } from '@/components/composer/use-parameter-controls-state';
import { ModelCompatibilitySummary } from '@/components/composer/ModelCompatibilitySummary';
import type { ResolvedSliderParam } from '@/components/composer/use-parameter-controls-state';

function ConfiguredSliderRow({ param }: { param: ResolvedSliderParam }) {
  return (
    <SliderNumberRow
      label={param.label}
      paramKey={param.paramKey}
      value={param.value}
      onChange={param.onChange}
      min={param.min}
      max={param.max}
      step={param.step}
      decimals={param.decimals}
      disabled={!param.canEdit}
      disabledReason={param.disabledReason}
    />
  );
}

const LEVEL_LABELS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra High',
  max: 'Max',
};

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
            className="h-6 w-28 text-xs"
            title={disabledReason}
          >
            <SelectValue>{LEVEL_LABELS[value] ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {values.map((item) => (
              <SelectItem key={item} value={item}>
                {LEVEL_LABELS[item] ?? item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ParameterControls() {
  const {
    capabilities,
    temperature,
    maxTokens,
    stream,
    thinkingEnabled,
    thinkingBudgetTokens,
    effort,
    verbosity,
    setMaxTokens,
    setStream,
    setThinkingEnabled,
    setThinkingBudgetTokens,
    setEffort,
    setVerbosity,
    resetParameters,
    samplingParams,
    penaltyParams,
    canEditMaxTokens,
    supportsStreaming,
    supportsThinking,
    supportsThinkingBudget,
    isAdaptiveThinkingOnly,
    effortSupport,
    verbositySupport,
    canEditTemperature,
    applyTempPreset,
  } = useParameterControlsState();

  const temperatureParam = samplingParams.find(
    (param) => param.capabilityKey === 'temperature',
  );
  const otherSamplingParams = samplingParams.filter(
    (param) => param.capabilityKey !== 'temperature',
  );

  return (
    <div className="flex flex-col gap-3">
      <ModelCompatibilitySummary />
      <SectionHeader>Sampling</SectionHeader>

      {temperatureParam && (
        <div className="flex flex-col gap-1.5">
          <ConfiguredSliderRow param={temperatureParam} />
          {canEditTemperature && (
            <div className="flex gap-1 pl-0">
              {TEMP_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="xs"
                  title={preset.title}
                  aria-pressed={Math.abs(temperature - preset.value) < 0.001}
                  onClick={() => applyTempPreset(preset.value)}
                  className={`flex-1 px-1 transition-colors ${
                    Math.abs(temperature - preset.value) < 0.001
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {otherSamplingParams.map((param) => (
        <ConfiguredSliderRow key={param.capabilityKey} param={param} />
      ))}

      <SectionHeader>Penalties</SectionHeader>

      {penaltyParams.map((param) => (
        <ConfiguredSliderRow key={param.capabilityKey} param={param} />
      ))}

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
            className="h-6 w-20 font-mono text-xs"
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
          <p className="text-muted-foreground/40 text-right text-xs">
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
            className="h-6 w-20 font-mono text-xs"
            min={1024}
            max={capabilities?.tokenLimits?.output ?? 1000000}
            step={1024}
          />
        </div>
      )}

      {supportsThinking && isAdaptiveThinkingOnly && thinkingEnabled && (
        <p className="text-muted-foreground/60 text-xs">
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

      {capabilities?.quirks && capabilities.quirks.length > 0 && (
        <div className="border-border/50 mt-1 rounded-lg border p-2">
          <p className="text-muted-foreground/60 mb-1 text-[11px] font-medium tracking-wide uppercase">
            Model notes
          </p>
          <ul className="text-muted-foreground/70 flex flex-col gap-0.5 text-xs">
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
        <Button variant="ghost" size="sm" onClick={resetParameters}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
