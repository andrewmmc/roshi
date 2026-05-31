import type { ProviderType } from '@/types/provider';

export type ModelModality = 'text' | 'image' | 'pdf' | 'audio' | 'video';

export type ParamSupport =
  | { supported: true; min?: number; max?: number; default?: number }
  | { supported: false; reason?: string }
  | { supported: 'default-only'; default: number; reason?: string };

export interface MaxTokensSupport {
  supported: boolean;
  wireName:
    | 'max_tokens'
    | 'max_completion_tokens'
    | 'maxOutputTokens'
    | 'max_tokens_anthropic';
}

export interface ThinkingSupport {
  modes: ('adaptive' | 'enabled')[];
  defaultMode: 'off' | 'adaptive' | 'enabled';
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
    verbosity?: VerbositySupport;
  };
  quirks?: string[];
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
          temperature: { supported: true, min: 0, max: 1, default: 1 },
          topP: { supported: true, min: 0, max: 1 },
          topK: { supported: true, min: 0 },
          maxTokens: { supported: true, wireName: 'max_tokens' },
          thinking: { modes: ['enabled'], defaultMode: 'off' },
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
