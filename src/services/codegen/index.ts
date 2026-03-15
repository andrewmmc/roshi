import type { ProviderConfig } from '@/types/provider';
import type { CodeGenerator } from './types';
import { openaiPythonGenerator } from './openai-python';
import { openaiNodeGenerator } from './openai-node';
import { anthropicPythonGenerator } from './anthropic-python';
import { anthropicNodeGenerator } from './anthropic-node';
import { geminiPythonGenerator } from './gemini-python';
import { geminiNodeGenerator } from './gemini-node';

const openAIGenerators: CodeGenerator[] = [openaiPythonGenerator, openaiNodeGenerator];
const anthropicGenerators: CodeGenerator[] = [anthropicPythonGenerator, anthropicNodeGenerator];
const geminiGenerators: CodeGenerator[] = [geminiPythonGenerator, geminiNodeGenerator];

export function getCodeGenerators(provider: ProviderConfig): CodeGenerator[] {
  switch (provider.type) {
    case 'openai-compatible':
    case 'custom':
      return openAIGenerators;
    case 'anthropic':
      return anthropicGenerators;
    case 'google-gemini':
      return geminiGenerators;
    default:
      return [];
  }
}
