export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  /** Full data URI, e.g. "data:application/pdf;base64,..." */
  data: string;
}

export interface NormalizedMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
}

export interface NormalizedRequest {
  messages: NormalizedMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
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
