import type { ProviderType } from '@/types/provider';
import type { MessageKey } from '@/i18n/types';
import type { NormalizedRequest } from '@/types/normalized';

export type ModelModality = 'text' | 'image' | 'pdf' | 'audio' | 'video';

export type ParamSupport =
  | {
      supported: true;
      min?: number;
      max?: number;
      default?: number;
      requiresEffort?: string;
      disabledWhileThinking?: boolean;
    }
  | { supported: false; reason?: MessageKey }
  | { supported: 'default-only'; default: number; reason?: MessageKey };

export interface MaxTokensSupport {
  supported: boolean;
  wireName:
    | 'max_tokens'
    | 'max_output_tokens'
    | 'max_completion_tokens'
    | 'maxOutputTokens'
    | 'max_tokens_anthropic';
}

export interface ThinkingSupport {
  modes: ('adaptive' | 'enabled')[];
  defaultMode: 'off' | 'adaptive' | 'enabled';
  budget?: { min: number; defaultMaxTokens: number };
}

/** Resolve conditions once for both the composer controls and outgoing requests. */
export function resolveParamSupport(
  support: ParamSupport | undefined,
  request: Pick<NormalizedRequest, 'effort' | 'thinking'>,
): ParamSupport | undefined {
  if (support?.supported !== true) return support;
  if (
    support.requiresEffort !== undefined &&
    request.effort !== support.requiresEffort
  ) {
    return {
      supported: false,
      reason: 'request.reasonSamplingRequiresNoReasoning',
    };
  }
  if (support.disabledWhileThinking && request.thinking?.enabled) {
    return { supported: false, reason: 'request.reasonThinkingSampling' };
  }
  return support;
}

export interface EffortSupport {
  levels: string[];
  defaultLevel: string;
  wireName: string;
}

export interface VerbositySupport {
  levels: string[];
  defaultLevel: string;
  wireName: string;
}

export interface ReasoningModeSupport {
  levels: string[];
  defaultLevel: string;
  wireName: string;
}

export interface ModelCapabilities {
  streaming: boolean;
  inputModalities: ModelModality[];
  outputModalities: ModelModality[];
  tokenLimits?: {
    context?: number;
    output?: number;
  };
  params: {
    temperature?: ParamSupport;
    topP?: ParamSupport;
    topK?: ParamSupport;
    frequencyPenalty?: ParamSupport;
    presencePenalty?: ParamSupport;
    maxTokens?: MaxTokensSupport;
    thinking?: ThinkingSupport;
    effort?: EffortSupport;
    reasoningMode?: ReasoningModeSupport;
    verbosity?: VerbositySupport;
  };
  quirks?: MessageKey[];
}

export interface ModelCapabilityPattern {
  pattern: RegExp;
  capabilities: ModelCapabilities;
}

export function defaultCapabilitiesForProviderType(
  type: ProviderType,
): ModelCapabilities {
  switch (type) {
    case 'anthropic':
      return {
        streaming: true,
        inputModalities: ['text', 'image', 'pdf'],
        outputModalities: ['text'],
        params: {
          temperature: {
            supported: true,
            min: 0,
            max: 1,
            default: 1,
            disabledWhileThinking: true,
          },
          topP: {
            supported: true,
            min: 0,
            max: 1,
            disabledWhileThinking: true,
          },
          topK: { supported: true, min: 0, disabledWhileThinking: true },
          maxTokens: { supported: true, wireName: 'max_tokens' },
          thinking: {
            modes: ['enabled'],
            defaultMode: 'off',
            budget: { min: 1024, defaultMaxTokens: 4096 },
          },
        },
      };
    case 'google-gemini':
      return {
        streaming: true,
        inputModalities: ['text', 'image', 'pdf', 'audio', 'video'],
        outputModalities: ['text'],
        params: {
          temperature: { supported: true, min: 0, max: 2, default: 1 },
          topP: { supported: true, min: 0, max: 1 },
          topK: { supported: true, min: 0 },
          frequencyPenalty: { supported: true, min: 0, max: 2 },
          presencePenalty: { supported: true, min: 0, max: 2 },
          maxTokens: { supported: true, wireName: 'maxOutputTokens' },
          thinking: { modes: ['enabled'], defaultMode: 'off' },
        },
      };
    case 'openai-compatible':
      return {
        streaming: true,
        inputModalities: ['text', 'image', 'pdf'],
        outputModalities: ['text'],
        params: {
          temperature: { supported: true, min: 0, max: 2, default: 1 },
          topP: { supported: true, min: 0, max: 1 },
          frequencyPenalty: { supported: true, min: -2, max: 2 },
          presencePenalty: { supported: true, min: -2, max: 2 },
          maxTokens: { supported: true, wireName: 'max_tokens' },
        },
      };
  }
}
