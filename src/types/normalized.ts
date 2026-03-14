export interface NormalizedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NormalizedRequest {
  messages: NormalizedMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  systemPrompt?: string;
}

export interface NormalizedResponse {
  id: string;
  model: string;
  content: string;
  role: 'assistant';
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

export interface NormalizedStreamChunk {
  content: string;
  finishReason: string | null;
  model?: string;
  id?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}
