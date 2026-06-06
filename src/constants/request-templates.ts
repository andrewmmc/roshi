import type { SavedRequestSnapshot } from '@/types/history';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
} from '@/constants/defaults';

export const TEMPLATE_COLLECTION_ID = 'roshi-starter-templates';

export interface RequestTemplateDefinition {
  id: string;
  name: string;
  description: string;
  request: SavedRequestSnapshot;
}

export const STARTER_REQUEST_TEMPLATES: RequestTemplateDefinition[] = [
  {
    id: 'template-summarize',
    name: 'Summarization',
    description: 'Condense long text into bullet points.',
    request: {
      messages: [
        {
          id: 'template-summarize-user',
          role: 'user',
          content:
            'Summarize the following text in 3-5 bullet points. Keep key facts and omit filler.\n\n[Paste text here]',
        },
      ],
      systemPrompt:
        'You are a concise summarizer. Use clear bullet points and preserve important names, dates, and numbers.',
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: 1024,
      topP: DEFAULT_TOP_P,
      frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: DEFAULT_PRESENCE_PENALTY,
      stream: true,
    },
  },
  {
    id: 'template-json-extract',
    name: 'JSON extraction',
    description: 'Extract structured fields from unstructured text.',
    request: {
      messages: [
        {
          id: 'template-json-user',
          role: 'user',
          content:
            'Extract the following fields from the text below and return valid JSON only:\n- title\n- date\n- participants\n- action_items\n\nText:\n[Paste text here]',
        },
      ],
      systemPrompt:
        'Return only valid JSON with no markdown fences or commentary.',
      temperature: 0.2,
      maxTokens: 2048,
      topP: DEFAULT_TOP_P,
      frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: DEFAULT_PRESENCE_PENALTY,
      stream: false,
    },
  },
  {
    id: 'template-image-analysis',
    name: 'Image analysis',
    description: 'Describe and analyze an attached image.',
    request: {
      messages: [
        {
          id: 'template-image-user',
          role: 'user',
          content:
            'Describe what you see in the attached image. Call out objects, text, layout, and anything unusual.',
        },
      ],
      systemPrompt:
        'Be specific and factual. Mention uncertainty when details are unclear.',
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      topP: DEFAULT_TOP_P,
      frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: DEFAULT_PRESENCE_PENALTY,
      stream: true,
    },
  },
  {
    id: 'template-coding',
    name: 'Coding assistant',
    description: 'Tool-free coding help with explanations.',
    request: {
      messages: [
        {
          id: 'template-coding-user',
          role: 'user',
          content:
            'Help me implement the following in TypeScript. Explain trade-offs briefly, then show the code.\n\nTask:\n[Describe the task]',
        },
      ],
      systemPrompt:
        'You are a senior engineer. Prefer simple, readable solutions. Do not assume external tools or network access.',
      temperature: 0.4,
      maxTokens: DEFAULT_MAX_TOKENS,
      topP: DEFAULT_TOP_P,
      frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: DEFAULT_PRESENCE_PENALTY,
      stream: true,
    },
  },
];
