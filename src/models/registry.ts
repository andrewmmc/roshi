import type { ModelCapabilities, ModelCapabilityPattern } from './capabilities';

const unsupportedSamplingReason =
  'This model family rejects non-default legacy sampling parameters.';

export const anthropicOpus47PlusCapabilities: ModelCapabilities = {
  streaming: true,
  inputModalities: ['text', 'image', 'pdf'],
  outputModalities: ['text'],
  tokenLimits: {
    context: 1_000_000,
    output: 128_000,
  },
  params: {
    temperature: { supported: false, reason: unsupportedSamplingReason },
    topP: { supported: false, reason: unsupportedSamplingReason },
    topK: { supported: false, reason: unsupportedSamplingReason },
    maxTokens: { supported: true, wireName: 'max_tokens' },
    thinking: { modes: ['adaptive'], defaultMode: 'off' },
    effort: {
      levels: ['low', 'medium', 'high', 'xhigh', 'max'],
      defaultLevel: 'high',
      wireName: 'output_config.effort',
    },
  },
  quirks: [
    'Sampling params must be omitted.',
    'Manual thinking budgets are not supported; use adaptive thinking.',
  ],
};

export const gpt5FamilyCapabilities: ModelCapabilities = {
  streaming: true,
  inputModalities: ['text', 'image', 'pdf'],
  outputModalities: ['text'],
  tokenLimits: {
    context: 1_050_000,
    output: 128_000,
  },
  params: {
    temperature: {
      supported: false,
      reason: 'Use reasoning effort and verbosity controls for GPT-5 models.',
    },
    topP: {
      supported: false,
      reason: 'Use reasoning effort and verbosity controls for GPT-5 models.',
    },
    frequencyPenalty: {
      supported: false,
      reason: 'Legacy sampling penalties are not a GPT-5 control surface.',
    },
    presencePenalty: {
      supported: false,
      reason: 'Legacy sampling penalties are not a GPT-5 control surface.',
    },
    maxTokens: { supported: true, wireName: 'max_completion_tokens' },
    effort: {
      levels: ['none', 'low', 'medium', 'high', 'xhigh'],
      defaultLevel: 'medium',
      wireName: 'reasoning.effort',
    },
    verbosity: {
      levels: ['low', 'medium', 'high'],
      defaultLevel: 'medium',
      wireName: 'text.verbosity',
    },
  },
  quirks: ['Responses API is recommended for reasoning and tool use.'],
};

export const gpt55ProCapabilities: ModelCapabilities = {
  ...gpt5FamilyCapabilities,
  streaming: false,
  quirks: [
    ...(gpt5FamilyCapabilities.quirks ?? []),
    'Streaming is not supported by GPT-5.5 Pro.',
  ],
};

export const geminiDefaultCapabilities: ModelCapabilities = {
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

export const MODEL_CAPABILITY_OVERRIDES: Record<string, ModelCapabilities> = {
  'gpt-5.5-pro': gpt55ProCapabilities,
  'gpt-5.5-pro-2026-04-23': gpt55ProCapabilities,
};

export const MODEL_CAPABILITY_PATTERNS: ModelCapabilityPattern[] = [
  {
    pattern: /^claude-opus-4-(?:[7-9]|\d{2,})(?:-|$)/,
    capabilities: anthropicOpus47PlusCapabilities,
  },
  {
    pattern: /^gpt-5\.5-pro(?:-|$)/,
    capabilities: gpt55ProCapabilities,
  },
  {
    pattern: /^gpt-5(?:\.|-|$)/,
    capabilities: gpt5FamilyCapabilities,
  },
  {
    pattern: /^gemini-/,
    capabilities: geminiDefaultCapabilities,
  },
];
