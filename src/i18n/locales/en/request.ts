export const request = {
  selectProvider: 'Select provider',
  selectModel: 'Select model',
  selectAProvider: 'Select a provider',
  selectAModel: 'Select a model',
  provider: 'Provider',
  model: 'Model',
  loadingProviders: 'Loading providers…',
  addProvider: 'Add provider',
  browseModels: 'Browse models',
  noModelsAvailable: 'No models available.',
  addApiKey: 'Add an API key in provider settings',
  moreActions: 'More actions',
  envPreview: 'Env preview',
  stop: 'Stop',
  send: 'Send',
  moreSendActions: 'More send actions',
  compareAcrossModels: 'Compare prompt across models',
  compareToast: 'Prompt copied to eval. Add models, then run compare.',
  messages: 'Messages',
  systemPrompt: 'System Prompt',
  headers: 'Headers',
  parameters: 'Parameters',
  optionalSystemPrompt: 'System prompt (optional)',
  sampling: 'Sampling',
  penalties: 'Penalties',
  output: 'Output',
  advanced: 'Advanced',
  user: 'User',
  assistant: 'Assistant',
  messageOptions: 'Message options',
  customHeaderName: 'Custom header name',
  customHeaderValue: 'Custom header value',
  headerName: 'Header name',
  headerValue: 'Header value',
  removeHeader: 'Remove header',

  // Parameter controls (shared by request and eval composers)
  temperature: 'Temperature',
  topP: 'Top P',
  topK: 'Top K',
  frequencyPenalty: 'Frequency Penalty',
  presencePenalty: 'Presence Penalty',
  maxTokens: 'Max Tokens',
  includeMaxTokens: 'Include Max Tokens',
  stream: 'Stream',
  thinking: 'Thinking',
  budgetTokens: 'Budget Tokens',
  effort: 'Effort',
  thinkingLevel: 'Thinking Level',
  verbosity: 'Verbosity',
  reasoningMode: 'Reasoning Mode',
  resetToDefaults: 'Reset to defaults',
  paramsIntro:
    'Optional parameters are off by default. Check a control to include it in the request; otherwise the model default is used.',
  maxTokensUnsupported: 'Max tokens is not supported by the selected model.',
  enableMaxTokensHint: 'Enable Max Tokens to include it in the request.',
  streamUnsupported: 'Streaming is not supported by the selected model.',
  thinkingUnsupported:
    'Thinking controls are not supported by the selected model.',
  adaptiveThinkingNote:
    'This model uses adaptive thinking — the reasoning depth is set automatically.',
  modelNotes: 'Model notes',
  modelLimit: 'model limit: {count}',
  paramNotSupported: 'Not supported by the selected model.',
  enableParamHint: 'Enable {label} to include it in the request.',
  includeParamAria: 'Include {label}',
  paramSliderAria: '{label} slider',
  moreInformation: 'More information',
  levelNone: 'None',
  levelLow: 'Low',
  levelMedium: 'Medium',
  levelHigh: 'High',
  levelXhigh: 'Extra High',
  levelMax: 'Max',
  presetDeterministic: 'Determ.',
  presetDeterministicTitle:
    'Deterministic — reproducible, exact outputs (temp = 0)',
  presetBalanced: 'Balanced',
  presetBalancedTitle: 'Balanced — good default for most tasks (temp = 0.7)',
  presetCreative: 'Creative',
  presetCreativeTitle:
    'Creative — more varied, imaginative responses (temp = 1.2)',
  presetRandom: 'Random',
  presetRandomTitle: 'Maximum variance (temp = 2)',
  paramInfoTemperature:
    'Controls output randomness. 0 = consistent/predictable. 1 = default. 2 = highly varied. Check to include in the request; leave unchecked to use the model default.',
  paramInfoTopP:
    'Limits the vocabulary the model samples from. Lower = more focused; higher = more varied. Check to include; on most providers use either temperature or Top P — not both.',
  paramInfoTopK:
    'Caps the number of candidate tokens the model can pick from. Lower = more predictable. Check to include. Supported by Anthropic and Gemini; ignored by OpenAI-compatible APIs.',
  paramInfoFrequencyPenalty:
    'Discourages the model from repeating words it has already used. Check to include. Positive values reduce repetition; negative values allow it. Range −2 to 2 (OpenAI). 0 to 2 (Gemini).',
  paramInfoPresencePenalty:
    'Pushes the model to introduce new topics by penalising any word that has appeared at all. Check to include. Positive values = more varied output. Range −2 to 2 (OpenAI). 0 to 2 (Gemini).',
  paramInfoMaxTokens:
    'Hard limit on response length. Check to include; leave unchecked to omit and use the model default. Higher values allow longer replies but cost more API credits.',
  paramInfoStream:
    'Receive tokens as they arrive instead of waiting for the full response. Useful for long outputs and latency testing.',
  paramInfoThinking:
    'Lets the model reason internally before answering — can improve accuracy on hard or ambiguous questions. Supported on Claude 3.7+, Gemini thinking models, and GPT-5 series.',
  paramInfoBudgetTokens:
    'How many tokens the model may spend on hidden reasoning steps. More = deeper analysis, slower response, higher cost.',
  paramInfoEffort:
    'Reasoning depth for o-series and Claude Opus 4.7+ models. Higher effort = more thorough output at greater cost and latency.',
  paramInfoReasoningMode:
    'Selects standard or pro reasoning execution for supported GPT-5.6 models.',
  paramInfoThinkingLevel:
    'Controls reasoning depth for Gemini 3 and newer models. Supported levels vary by model.',
  paramInfoVerbosity:
    'Controls how long and detailed the final answer is (GPT-5 Responses API).',
} as const;
