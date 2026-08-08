import type { NormalizedMessage, NormalizedRequest } from '@/types/normalized';
import { resolveProviderProtocol } from '@/types/provider';
import type { CodeGenParams } from './types';
import {
  anthropicRejectsSamplingParams,
  usesAnthropicAdaptiveThinking,
} from '@/models/model-families';

export { anthropicRejectsSamplingParams, usesAnthropicAdaptiveThinking };

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
  provider: CodeGenParams['provider'],
  model: string,
): boolean {
  return (
    resolveProviderProtocol(provider) === 'openai-responses' ||
    (provider.name === 'OpenAI' &&
      provider.type === 'openai-compatible' &&
      /^gpt-5(?:\.|-|$)/.test(model))
  );
}

/** Merge provider + request custom headers for codegen output. */
export function mergeCodegenCustomHeaders(
  provider: CodeGenParams['provider'],
  customHeaders?: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...provider.customHeaders, ...customHeaders }).filter(
      ([key, value]) => key.trim() !== '' && value.trim() !== '',
    ),
  );
}

export function formatJsHeaderEntries(
  headers: Record<string, string>,
): string[] {
  return Object.entries(headers).map(
    ([key, value]) => `    "${key}": ${escapeJSString(value)},`,
  );
}

export function formatPythonHeaderEntries(
  headers: Record<string, string>,
): string[] {
  return Object.entries(headers).map(
    ([key, value]) => `        "${key}": ${escapePythonString(value)},`,
  );
}

export function buildAnthropicThinkingArgs(
  request: NormalizedRequest,
): string[] {
  const args: string[] = [];
  if (request.thinking?.enabled) {
    args.push(
      usesAnthropicAdaptiveThinking(request.model)
        ? `  thinking: { type: "adaptive" },`
        : `  thinking: { type: "enabled", budget_tokens: ${request.thinking.budgetTokens} },`,
    );
  }
  if (request.effort !== undefined) {
    args.push(`  output_config: { effort: "${request.effort}" },`);
  }
  return args;
}

export function buildAnthropicThinkingPythonKwargs(
  request: NormalizedRequest,
): string[] {
  const kwargs: string[] = [];
  if (request.thinking?.enabled) {
    kwargs.push(
      usesAnthropicAdaptiveThinking(request.model)
        ? `    thinking={"type": "adaptive"},`
        : `    thinking={"type": "enabled", "budget_tokens": ${request.thinking.budgetTokens}},`,
    );
  }
  if (request.effort !== undefined) {
    kwargs.push(`    output_config={"effort": "${request.effort}"},`);
  }
  return kwargs;
}
