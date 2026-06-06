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

export const PARAM_INFO: Record<string, string> = {
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

export const TEMP_PRESETS = [
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

export type SliderCapabilityKey =
  | 'temperature'
  | 'topP'
  | 'topK'
  | 'frequencyPenalty'
  | 'presencePenalty';

export interface SliderParamConfig {
  label: string;
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
    label: 'Temperature',
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
    label: 'Top P',
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
    label: 'Top K',
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
    label: 'Frequency Penalty',
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
    label: 'Presence Penalty',
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
): string | undefined {
  if (!disabled) return undefined;
  if (support?.supported === false) return support.reason;
  if (support?.supported === 'default-only') return support.reason;
  return 'Not supported by the selected model.';
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
  stream: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effort: string;
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
    stream: true,
    thinkingEnabled: DEFAULT_THINKING_ENABLED,
    thinkingBudgetTokens: DEFAULT_THINKING_BUDGET_TOKENS,
    effort: capabilities?.params.effort?.defaultLevel ?? DEFAULT_EFFORT,
    verbosity:
      capabilities?.params.verbosity?.defaultLevel ?? DEFAULT_VERBOSITY,
  };
}
