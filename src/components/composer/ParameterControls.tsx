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
import { useTranslation, type MessageKey } from '@/i18n';

function ConfiguredSliderRow({ param }: { param: ResolvedSliderParam }) {
  const { t } = useTranslation();
  return (
    <SliderNumberRow
      label={t(param.labelKey)}
      paramKey={param.paramKey}
      value={param.value}
      onChange={param.onChange}
      min={param.min}
      max={param.max}
      step={param.step}
      decimals={param.decimals}
      disabled={!param.canEdit}
      disabledReason={param.disabledReason}
      enabled={param.enabled}
      onEnabledChange={param.onEnabledChange}
      enableDisabled={!param.canEdit}
      enableDisabledReason={param.disabledReason}
    />
  );
}

const LEVEL_LABELS: Record<string, MessageKey> = {
  none: 'request.levelNone',
  low: 'request.levelLow',
  medium: 'request.levelMedium',
  high: 'request.levelHigh',
  xhigh: 'request.levelXhigh',
  max: 'request.levelMax',
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
  const { t } = useTranslation();
  const inputId = `param-${paramKey}`;
  const infoKey = PARAM_INFO[paramKey];
  const info = infoKey ? t(infoKey) : undefined;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label
            htmlFor={inputId}
            className={`text-xs ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
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
            <SelectValue>
              {value in LEVEL_LABELS ? t(LEVEL_LABELS[value]) : value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {values.map((item) => (
              <SelectItem key={item} value={item}>
                {item in LEVEL_LABELS ? t(LEVEL_LABELS[item]) : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ParameterControls() {
  const { t, formatNumber } = useTranslation();
  const {
    capabilities,
    temperature,
    maxTokens,
    maxTokensEnabled,
    stream,
    thinkingEnabled,
    thinkingBudgetTokens,
    effort,
    reasoningMode,
    verbosity,
    setMaxTokens,
    setParamEnabled,
    setStream,
    setThinkingEnabled,
    setThinkingBudgetTokens,
    setEffort,
    setReasoningMode,
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
    reasoningModeSupport,
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

  const maxTokensControlsDisabled = !canEditMaxTokens || !maxTokensEnabled;
  const maxTokensTitle = !canEditMaxTokens
    ? t('request.maxTokensUnsupported')
    : !maxTokensEnabled
      ? t('request.enableMaxTokensHint')
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <ModelCompatibilitySummary />
      <p className="text-muted-foreground/70 text-xs leading-snug">
        {t('request.paramsIntro')}
      </p>
      <SectionHeader>{t('request.sampling')}</SectionHeader>

      {temperatureParam && (
        <div className="flex flex-col gap-1.5">
          <ConfiguredSliderRow param={temperatureParam} />
          {canEditTemperature && (
            <div className="flex gap-1 pl-0">
              {TEMP_PRESETS.map((preset) => (
                <Button
                  key={preset.labelKey}
                  variant="outline"
                  size="xs"
                  title={t(preset.titleKey)}
                  aria-pressed={
                    temperatureParam.enabled &&
                    Math.abs(temperature - preset.value) < 0.001
                  }
                  onClick={() => applyTempPreset(preset.value)}
                  className={`flex-1 px-1 transition-colors ${
                    temperatureParam.enabled &&
                    Math.abs(temperature - preset.value) < 0.001
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }`}
                >
                  {t(preset.labelKey)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {otherSamplingParams.map((param) => (
        <ConfiguredSliderRow key={param.capabilityKey} param={param} />
      ))}

      <SectionHeader>{t('request.penalties')}</SectionHeader>

      {penaltyParams.map((param) => (
        <ConfiguredSliderRow key={param.capabilityKey} param={param} />
      ))}

      <SectionHeader>{t('request.output')}</SectionHeader>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <input
              type="checkbox"
              checked={maxTokensEnabled}
              onChange={(e) => setParamEnabled('maxTokens', e.target.checked)}
              disabled={!canEditMaxTokens}
              title={
                !canEditMaxTokens
                  ? t('request.maxTokensUnsupported')
                  : undefined
              }
              aria-label={t('request.includeMaxTokens')}
              className="rounded"
            />
            <Label
              htmlFor="param-max-tokens"
              className={`text-xs ${!canEditMaxTokens || !maxTokensEnabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
              title={maxTokensTitle}
            >
              {t('request.maxTokens')}
            </Label>
            <InfoTooltip content={t(PARAM_INFO['max-tokens'])} />
          </div>
          <Input
            id="param-max-tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 0)}
            className="h-6 w-20 font-mono text-xs"
            min={1}
            max={capabilities?.tokenLimits?.output ?? 1000000}
            disabled={maxTokensControlsDisabled}
            title={maxTokensTitle}
          />
        </div>
        {capabilities?.tokenLimits?.output && (
          <p className="text-muted-foreground/60 text-right text-xs">
            {t('request.modelLimit', {
              count: formatNumber(capabilities.tokenLimits.output),
            })}
          </p>
        )}
      </div>

      <CheckboxRow
        label={t('request.stream')}
        paramKey="stream"
        checked={stream && supportsStreaming}
        onChange={setStream}
        disabled={!supportsStreaming}
        disabledReason={
          !supportsStreaming ? t('request.streamUnsupported') : undefined
        }
      />

      <SectionHeader>{t('request.advanced')}</SectionHeader>

      <CheckboxRow
        label={t('request.thinking')}
        paramKey="thinking"
        checked={thinkingEnabled}
        onChange={setThinkingEnabled}
        disabled={!supportsThinking}
        disabledReason={
          !supportsThinking ? t('request.thinkingUnsupported') : undefined
        }
      />

      {supportsThinking && supportsThinkingBudget && thinkingEnabled && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <Label
              htmlFor="param-budget-tokens"
              className="text-muted-foreground text-xs"
            >
              {t('request.budgetTokens')}
            </Label>
            <InfoTooltip content={t(PARAM_INFO['budget-tokens'])} />
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
          {t('request.adaptiveThinkingNote')}
        </p>
      )}

      {effortSupport && (
        <SelectRow
          label={
            effortSupport.wireName.endsWith('thinkingLevel')
              ? t('request.thinkingLevel')
              : t('request.effort')
          }
          paramKey={
            effortSupport.wireName.endsWith('thinkingLevel')
              ? 'thinking-level'
              : 'effort'
          }
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
          label={t('request.verbosity')}
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

      {reasoningModeSupport && (
        <SelectRow
          label={t('request.reasoningMode')}
          paramKey="reasoning-mode"
          value={
            reasoningModeSupport.levels.includes(reasoningMode)
              ? reasoningMode
              : reasoningModeSupport.defaultLevel
          }
          values={reasoningModeSupport.levels}
          onChange={setReasoningMode}
        />
      )}

      {capabilities?.quirks && capabilities.quirks.length > 0 && (
        <div className="border-border/50 mt-1 rounded-lg border p-2">
          <p className="text-muted-foreground/60 mb-1 text-[11px] font-medium tracking-wide uppercase">
            {t('request.modelNotes')}
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
          {t('request.resetToDefaults')}
        </Button>
      </div>
    </div>
  );
}
