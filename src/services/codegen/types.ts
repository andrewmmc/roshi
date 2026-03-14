import type { ProviderConfig } from '@/types/provider';
import type { NormalizedMessage } from '@/types/normalized';

export interface CodeGenParams {
  provider: ProviderConfig;
  model: string;
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

export interface CodeGenerator {
  label: string;
  language: string;
  generate(params: CodeGenParams): string;
}
