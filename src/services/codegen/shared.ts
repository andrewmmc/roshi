import type { NormalizedMessage } from '@/types/normalized';
import { resolveProviderProtocol, type ProviderConfig } from '@/types/provider';

export function escapeJSString(s: string): string {
  if (s.includes('\n')) {
    return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
  }
  return (
    '"' +
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') +
    '"'
  );
}

export function escapePythonString(s: string): string {
  if (s.includes('\n')) {
    return 'r"""' + s.replace(/"""/g, '""\\"') + '"""';
  }
  return (
    '"' +
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') +
    '"'
  );
}

export function isSendableMessage(message: NormalizedMessage): boolean {
  return (
    message.content.trim() !== '' || (message.attachments?.length ?? 0) > 0
  );
}

export function getSendableMessages(
  messages: readonly NormalizedMessage[],
): NormalizedMessage[] {
  return messages.filter(isSendableMessage);
}

export function shouldGenerateOpenAIResponses(
  provider: ProviderConfig,
  model: string,
): boolean {
  return (
    resolveProviderProtocol(provider) === 'openai-responses' ||
    (provider.name === 'OpenAI' &&
      provider.type === 'openai-compatible' &&
      /^gpt-5(?:\.|-|$)/.test(model))
  );
}
