export const onboarding = {
  samplePrompt:
    'Explain what an LLM API request looks like in one short paragraph.',
  stepApiKey: 'Add a provider API key',
  actionAddApiKey: 'Add API key',
  stepModel: 'Pick at least one model',
  actionBrowseModels: 'Browse Models',
  stepSend: 'Send a sample prompt',
  actionInsertSample: 'Insert sample',
  closeChecklist: 'Close checklist',
  title: 'Get started with Roshi',
  subtitle: 'Complete these steps to send your first request.',
  emptyNoProviders: 'Add a provider API key to send your first request.',
  emptyNeedsApiKey: 'Add an API key for {name} before sending.',
  emptyNeedsModel: 'Pick a model for {name} before sending.',
  emptyWriteMessage:
    'Write a message, then send the request to see the response here.',
  actionPickModel: 'Pick a model',
} as const;
