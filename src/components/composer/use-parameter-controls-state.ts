import { useShallow } from 'zustand/react/shallow';
import { useComposerStore } from '@/stores/composer-store';
import { useSelectedModelCapabilities } from '@/stores/provider-store';
import type { ModelCapabilities } from '@/models/capabilities';
import {
  getCapabilityAwareParameterDefaults,
  getCapabilitySupport,
  getDisabledReason,
  getParamMax,
  getParamMin,
  isParamEditable,
  SLIDER_PARAM_CONFIGS,
  type SliderParamConfig,
} from '@/components/composer/parameter-control-utils';

export interface ResolvedSliderParam extends SliderParamConfig {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  canEdit: boolean;
  disabledReason?: string;
}

export interface ParameterControlsState {
  capabilities: ModelCapabilities | null;
  hasCapabilities: boolean;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effort: string;
  verbosity: string;
  setTemperature: (value: number) => void;
  setMaxTokens: (value: number) => void;
  setStream: (value: boolean) => void;
  setThinkingEnabled: (value: boolean) => void;
  setThinkingBudgetTokens: (value: number) => void;
  setEffort: (value: string) => void;
  setVerbosity: (value: string) => void;
  resetParameters: () => void;
  samplingParams: ResolvedSliderParam[];
  penaltyParams: ResolvedSliderParam[];
  canEditMaxTokens: boolean;
  supportsStreaming: boolean;
  supportsThinking: boolean;
  supportsThinkingBudget: boolean;
  isAdaptiveThinkingOnly: boolean;
  effortSupport: ModelCapabilities['params']['effort'];
  verbositySupport: ModelCapabilities['params']['verbosity'];
  tempMin: number;
  tempMax: number;
  canEditTemperature: boolean;
  applyTempPreset: (value: number) => void;
}

export function useParameterControlsState(): ParameterControlsState {
  const capabilities = useSelectedModelCapabilities();
  const hasCapabilities = Boolean(capabilities);

  const composer = useComposerStore(
    useShallow((s) => ({
      temperature: s.temperature,
      maxTokens: s.maxTokens,
      topP: s.topP,
      topK: s.topK,
      frequencyPenalty: s.frequencyPenalty,
      presencePenalty: s.presencePenalty,
      stream: s.stream,
      thinkingEnabled: s.thinkingEnabled,
      thinkingBudgetTokens: s.thinkingBudgetTokens,
      effort: s.effort,
      verbosity: s.verbosity,
      setTemperature: s.setTemperature,
      setMaxTokens: s.setMaxTokens,
      setTopP: s.setTopP,
      setTopK: s.setTopK,
      setFrequencyPenalty: s.setFrequencyPenalty,
      setPresencePenalty: s.setPresencePenalty,
      setStream: s.setStream,
      setThinkingEnabled: s.setThinkingEnabled,
      setThinkingBudgetTokens: s.setThinkingBudgetTokens,
      setEffort: s.setEffort,
      setVerbosity: s.setVerbosity,
    })),
  );

  const valueByKey = {
    temperature: composer.temperature,
    topP: composer.topP,
    topK: composer.topK,
    frequencyPenalty: composer.frequencyPenalty,
    presencePenalty: composer.presencePenalty,
  } as const;

  const setterByKey = {
    temperature: composer.setTemperature,
    topP: composer.setTopP,
    topK: composer.setTopK,
    frequencyPenalty: composer.setFrequencyPenalty,
    presencePenalty: composer.setPresencePenalty,
  } as const;

  const resolveSliderParam = (
    config: SliderParamConfig,
  ): ResolvedSliderParam => {
    const support = getCapabilitySupport(capabilities, config.capabilityKey);
    const canEdit = isParamEditable(
      support,
      hasCapabilities,
      config.fallbackEditable,
    );

    return {
      ...config,
      value: valueByKey[config.capabilityKey],
      onChange: setterByKey[config.capabilityKey],
      min: getParamMin(support, config.fallbackMin),
      max: getParamMax(support, config.fallbackMax),
      canEdit,
      disabledReason: getDisabledReason(support, !canEdit),
    };
  };

  const sliderParams = SLIDER_PARAM_CONFIGS.map(resolveSliderParam);
  const temperatureSupport = getCapabilitySupport(capabilities, 'temperature');
  const canEditTemperature = isParamEditable(
    temperatureSupport,
    hasCapabilities,
    true,
  );
  const tempMin = getParamMin(temperatureSupport, 0);
  const tempMax = getParamMax(temperatureSupport, 2);

  const maxTokensSupport = capabilities?.params.maxTokens;
  const thinkingSupport = capabilities?.params.thinking;
  const effortSupport = capabilities?.params.effort;
  const verbositySupport = capabilities?.params.verbosity;

  const supportsThinking = Boolean(thinkingSupport);
  const supportsThinkingBudget =
    thinkingSupport?.modes.includes('enabled') ?? false;
  const isAdaptiveThinkingOnly =
    supportsThinking &&
    !supportsThinkingBudget &&
    (thinkingSupport?.modes.includes('adaptive') ?? false);

  return {
    capabilities,
    hasCapabilities,
    temperature: composer.temperature,
    maxTokens: composer.maxTokens,
    stream: composer.stream,
    thinkingEnabled: composer.thinkingEnabled,
    thinkingBudgetTokens: composer.thinkingBudgetTokens,
    effort: composer.effort,
    verbosity: composer.verbosity,
    setTemperature: composer.setTemperature,
    setMaxTokens: composer.setMaxTokens,
    setStream: composer.setStream,
    setThinkingEnabled: composer.setThinkingEnabled,
    setThinkingBudgetTokens: composer.setThinkingBudgetTokens,
    setEffort: composer.setEffort,
    setVerbosity: composer.setVerbosity,
    resetParameters: () => {
      const defaults = getCapabilityAwareParameterDefaults(capabilities);
      composer.setTemperature(defaults.temperature);
      composer.setMaxTokens(defaults.maxTokens);
      composer.setTopP(defaults.topP);
      composer.setTopK(defaults.topK);
      composer.setFrequencyPenalty(defaults.frequencyPenalty);
      composer.setPresencePenalty(defaults.presencePenalty);
      composer.setStream(defaults.stream);
      composer.setThinkingEnabled(defaults.thinkingEnabled);
      composer.setThinkingBudgetTokens(defaults.thinkingBudgetTokens);
      composer.setEffort(defaults.effort);
      composer.setVerbosity(defaults.verbosity);
    },
    samplingParams: sliderParams.filter(
      (param) => param.section === 'sampling',
    ),
    penaltyParams: sliderParams.filter(
      (param) => param.section === 'penalties',
    ),
    canEditMaxTokens: capabilities
      ? maxTokensSupport?.supported === true
      : true,
    supportsStreaming: capabilities?.streaming ?? true,
    supportsThinking,
    supportsThinkingBudget,
    isAdaptiveThinkingOnly,
    effortSupport,
    verbositySupport,
    tempMin,
    tempMax,
    canEditTemperature,
    applyTempPreset: (value: number) => {
      if (!canEditTemperature) return;
      composer.setTemperature(Math.min(tempMax, Math.max(tempMin, value)));
    },
  };
}
