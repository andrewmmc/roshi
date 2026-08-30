import type { ModelCapabilities, ParamSupport } from '@/models/capabilities';
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
  DEFAULT_REASONING_MODE,
  DEFAULT_VERBOSITY,
  TEMPERATURE_MIN,
  TEMPERATURE_MAX,
  TOP_P_MIN,
  TOP_P_MAX,
  FREQUENCY_PENALTY_MIN,
  FREQUENCY_PENALTY_MAX,
  PRESENCE_PENALTY_MIN,
  PRESENCE_PENALTY_MAX,
} from '@/constants/defaults';
import {
  createDefaultParamEnabled,
  type ParamEnabledState,
} from '@/types/optional-params';
import type { MessageKey } from '@/i18n/types';

export const PARAM_INFO: Record<string, MessageKey> = {
  temperature: 'request.paramInfoTemperature',
  'top-p': 'request.paramInfoTopP',
  'top-k': 'request.paramInfoTopK',
  'frequency-penalty': 'request.paramInfoFrequencyPenalty',
  'presence-penalty': 'request.paramInfoPresencePenalty',
  'max-tokens': 'request.paramInfoMaxTokens',
  stream: 'request.paramInfoStream',
  thinking: 'request.paramInfoThinking',
  'budget-tokens': 'request.paramInfoBudgetTokens',
  effort: 'request.paramInfoEffort',
  'reasoning-mode': 'request.paramInfoReasoningMode',
  'thinking-level': 'request.paramInfoThinkingLevel',
  verbosity: 'request.paramInfoVerbosity',
};

export const TEMP_PRESETS = [
  {
    labelKey: 'request.presetDeterministic',
    titleKey: 'request.presetDeterministicTitle',
    value: 0,
  },
  {
    labelKey: 'request.presetBalanced',
    titleKey: 'request.presetBalancedTitle',
    value: 0.7,
  },
  {
    labelKey: 'request.presetCreative',
    titleKey: 'request.presetCreativeTitle',
    value: 1.2,
  },
  {
    labelKey: 'request.presetRandom',
    titleKey: 'request.presetRandomTitle',
    value: 2,
  },
] as const;

export type SliderCapabilityKey =
  'temperature' | 'topP' | 'topK' | 'frequencyPenalty' | 'presencePenalty';

export interface SliderParamConfig {
  labelKey: MessageKey;
  paramKey: string;
  capabilityKey: SliderCapabilityKey;
  fallbackEditable: boolean;
  fallbackMin: number;
  fallbackMax: number;
  step: number;
  decimals: number;
  section: 'sampling' | 'penalties';
}

export const SLIDER_PARAM_CONFIGS: SliderParamConfig[] = [
  {
    labelKey: 'request.temperature',
    paramKey: 'temperature',
    capabilityKey: 'temperature',
    fallbackEditable: true,
    fallbackMin: TEMPERATURE_MIN,
    fallbackMax: TEMPERATURE_MAX,
    step: 0.01,
    decimals: 2,
    section: 'sampling',
  },
  {
    labelKey: 'request.topP',
    paramKey: 'top-p',
    capabilityKey: 'topP',
    fallbackEditable: true,
    fallbackMin: TOP_P_MIN,
    fallbackMax: TOP_P_MAX,
    step: 0.01,
    decimals: 2,
    section: 'sampling',
  },
  {
    labelKey: 'request.topK',
    paramKey: 'top-k',
    capabilityKey: 'topK',
    fallbackEditable: false,
    fallbackMin: 0,
    fallbackMax: 500,
    step: 1,
    decimals: 0,
    section: 'sampling',
  },
  {
    labelKey: 'request.frequencyPenalty',
    paramKey: 'frequency-penalty',
    capabilityKey: 'frequencyPenalty',
    fallbackEditable: true,
    fallbackMin: FREQUENCY_PENALTY_MIN,
    fallbackMax: FREQUENCY_PENALTY_MAX,
    step: 0.01,
    decimals: 2,
    section: 'penalties',
  },
  {
    labelKey: 'request.presencePenalty',
    paramKey: 'presence-penalty',
    capabilityKey: 'presencePenalty',
    fallbackEditable: true,
    fallbackMin: PRESENCE_PENALTY_MIN,
    fallbackMax: PRESENCE_PENALTY_MAX,
    step: 0.01,
    decimals: 2,
    section: 'penalties',
  },
];

export function isParamEditable(
  support: ParamSupport | undefined,
  hasCapabilities: boolean,
  fallback: boolean,
): boolean {
  return hasCapabilities ? support?.supported === true : fallback;
}

export function getParamMin(
  support: ParamSupport | undefined,
  fallback: number,
): number {
  return support && support.supported === true && support.min !== undefined
    ? support.min
    : fallback;
}

export function getParamMax(
  support: ParamSupport | undefined,
  fallback: number,
): number {
  return support && support.supported === true && support.max !== undefined
    ? support.max
    : fallback;
}

export function getDisabledReason(
  support: ParamSupport | undefined,
  disabled: boolean,
  translate?: (key: MessageKey) => string,
): string | undefined {
  if (!disabled) return undefined;
  if (support?.supported === false) return support.reason;
  if (support?.supported === 'default-only') return support.reason;
  return translate
    ? translate('request.paramNotSupported')
    : 'Not supported by the selected model.';
}

export function getCapabilitySupport(
  capabilities: ModelCapabilities | null,
  key: SliderCapabilityKey,
): ParamSupport | undefined {
  return capabilities?.params[key];
}

export interface ParameterDefaults {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  paramEnabled: ParamEnabledState;
  stream: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effort: string;
  reasoningMode: string;
  verbosity: string;
}

export function getCapabilityAwareParameterDefaults(
  capabilities: ModelCapabilities | null,
): ParameterDefaults {
  return {
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    topP: DEFAULT_TOP_P,
    topK: DEFAULT_TOP_K,
    frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
    presencePenalty: DEFAULT_PRESENCE_PENALTY,
    paramEnabled: createDefaultParamEnabled(),
    stream: true,
    thinkingEnabled: DEFAULT_THINKING_ENABLED,
    thinkingBudgetTokens: DEFAULT_THINKING_BUDGET_TOKENS,
    effort: capabilities?.params.effort?.defaultLevel ?? DEFAULT_EFFORT,
    reasoningMode:
      capabilities?.params.reasoningMode?.defaultLevel ??
      DEFAULT_REASONING_MODE,
    verbosity:
      capabilities?.params.verbosity?.defaultLevel ?? DEFAULT_VERBOSITY,
  };
}
