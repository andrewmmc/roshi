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

  // Composer misc
  system: 'System',
  draftSaving: 'Saving draft…',
  draftError: 'Draft not saved',
  draftSaved: 'Saved locally',
  draftErrorTitle: 'Roshi could not save this local draft.',
  draftSavedTitle: 'Unsent request drafts are stored on this device.',
  tokenEstimate: '~{count} tokens',
  tokenEstimateDetail: 'Estimated prompt tokens: {count}',
  attachmentTooLarge: 'Attachment must be 5 MB or smaller.',
  attachmentReadError: 'Could not read the selected file.',
  roleForMessage: 'Role for message {index}',
  messageAria: '{role} message {index}',
  messagePlaceholder: '{role} message...',
  attachFileToMessage: 'Attach file to message {index}',
  attachFile: 'Attach file',
  attachUrl: 'Attach URL',
  removeAttachment: 'Remove {name}',
  clearMessage: 'Clear message',
  deleteMessage: 'Delete message',
  addMessage: 'Add message',
  clearMessageQuestion: 'Clear message?',
  deleteMessageQuestion: 'Delete message?',
  clearMessageDescription:
    'This will clear all content and attachments from this message.',
  deleteMessageDescription:
    'This message has content that will be lost. This action cannot be undone.',
  clearAction: 'Clear',
  headerNameAria: 'Header {index} name',
  headerValueAria: 'Header {index} value',
  addHeader: 'Add header',
  fromProvider: 'From provider',
  customLabel: 'Custom',
  providerHeaderName: 'Provider header name: {key}',
  providerHeaderValue: 'Provider header value for {key}',
  settingsOmitted: 'Some settings will be omitted when sending',

  // Tabs
  maxTabsReached: 'Maximum of {count} tabs reached.',
  newTabWhileRunning: 'Cannot create a new tab while a request is running.',
  duplicateTabWhileRunning:
    'Cannot duplicate a tab while a request is running.',
  closeTabWhileRunning:
    'Cannot close the active tab while a request is running.',
  switchTabWhileRunning: 'Cannot switch tabs while a request is running.',

  // Send / validation errors
  messageRequired: 'Please enter at least one message',
  providerAndModelRequired: 'Please select a provider and model',
  missingEnvVariables: 'Missing environment variables: {variables}',
  missingEnvVarsWithEnv:
    'Add these variables to the selected environment or remove the placeholders before sending.',
  missingEnvVarsNoEnv:
    'Select an environment with these variables or remove the placeholders before sending.',
  historySaveFailed:
    'Response completed, but history could not be saved locally.',
  providerHttpError: 'Provider returned HTTP {status}',
  networkError: 'Network request failed before the provider responded',
  networkErrorDetail:
    'The app did not receive an HTTP response from the provider. This usually means DNS, TLS/certificate validation, connectivity, or an unreachable host.',
  unexpectedError: 'Unexpected request error',
  timedOut: 'Request timed out',
  timeoutDetail:
    'The request exceeded the 120-second timeout. The provider may be overloaded or unreachable.',
  cancelled: 'Request cancelled',
  invalidJson: 'Provider returned invalid JSON',
  streamInterrupted: 'Stream interrupted',
  streamIdleTimeout:
    'The stream stopped receiving data before completion. The provider may be overloaded or unreachable.',
  streamEndedEarly:
    'The stream ended before the provider sent a completion event.',

  // Model compatibility
  paramLabelStream: 'Streaming',
  paramLabelImages: 'Images',
  paramLabelContext: 'Context',
  paramLabelMaxOutput: 'Max output',
  paramUnsupportedGeneric: 'This parameter is not supported by this model.',
  paramDefaultOnly: 'This model only supports the default value ({default}).',
  paramOmittedWarning: '{label} was omitted: {reason}',
  streamUnsupportedModel: 'Streaming is not supported by this model.',
  maxTokensUnsupportedModel: 'Max tokens is not supported by this model.',
  thinkingUnsupportedModel:
    'Thinking controls are not supported by this model.',
  effortUnsupported: 'Effort is not supported by this model.',
  reasoningModeUnsupported: 'Reasoning mode is not supported by this model.',
  verbosityUnsupported: 'Verbosity is not supported by this model.',
  modelCompatibility: 'Model compatibility',
  supported: 'Supported',
  notSupported: 'Not supported',
} as const;
