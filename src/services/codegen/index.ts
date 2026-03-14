import type { ProviderConfig } from '@/types/provider';
import type { CodeGenerator } from './types';
import { openaiPythonGenerator } from './openai-python';
import { openaiNodeGenerator } from './openai-node';

const generators: CodeGenerator[] = [openaiPythonGenerator, openaiNodeGenerator];

export function getCodeGenerators(provider: ProviderConfig): CodeGenerator[] {
  if (provider.type === 'openai-compatible' || provider.type === 'custom') {
    return generators;
  }
  return [];
}
