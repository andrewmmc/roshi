import type { Environment } from '@/types/history';
import type { HeaderEntry } from '@/utils/headers';
import type { NormalizedMessage } from '@/types/normalized';

const VARIABLE_PATTERN = /{{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*}}/g;

const SECRET_KEY_PATTERN =
  /(?:^|_)(?:api[_-]?key|secret|token|password|passwd|auth|credential|private)(?:$|_)/i;

export interface InterpolationResult {
  value: string;
  missingVariables: string[];
}

export interface ComposerInterpolationResult {
  messages: NormalizedMessage[];
  systemPrompt: string;
  customHeaders: HeaderEntry[];
  missingVariables: string[];
}

export type EnvironmentVariableStatus = 'resolved' | 'missing' | 'unused';

export interface EnvironmentVariablePreview {
  key: string;
  status: EnvironmentVariableStatus;
  resolvedValue: string | null;
  masked: boolean;
}

export interface EnvironmentPreview {
  environmentName: string | null;
  variables: EnvironmentVariablePreview[];
  missingVariables: string[];
  hasPlaceholders: boolean;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function isSecretVariableKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/-/g, '_');
  return SECRET_KEY_PATTERN.test(normalized);
}

export function maskSecretValue(value: string): string {
  if (!value) return '';
  return '•'.repeat(Math.min(Math.max(value.length, 6), 12));
}

export function extractVariableReferences(input: string): string[] {
  const references: string[] = [];
  for (const match of input.matchAll(VARIABLE_PATTERN)) {
    references.push(match[1]);
  }
  return unique(references);
}

export function collectComposerVariableReferences({
  messages,
  systemPrompt,
  customHeaders,
}: {
  messages: NormalizedMessage[];
  systemPrompt: string;
  customHeaders: HeaderEntry[];
}): string[] {
  const references: string[] = [];
  for (const message of messages) {
    references.push(...extractVariableReferences(message.content));
  }
  references.push(...extractVariableReferences(systemPrompt));
  for (const header of customHeaders) {
    references.push(...extractVariableReferences(header.key));
    references.push(...extractVariableReferences(header.value));
  }
  return unique(references);
}

export function buildEnvironmentPreview({
  messages,
  systemPrompt,
  customHeaders,
  environment,
}: {
  messages: NormalizedMessage[];
  systemPrompt: string;
  customHeaders: HeaderEntry[];
  environment: Environment | null;
}): EnvironmentPreview {
  const referenced = collectComposerVariableReferences({
    messages,
    systemPrompt,
    customHeaders,
  });
  const variableMap = environmentToVariableMap(environment);
  const referencedSet = new Set(referenced);
  const variables: EnvironmentVariablePreview[] = [];

  for (const key of referenced) {
    const hasValue = Object.prototype.hasOwnProperty.call(variableMap, key);
    const resolvedValue = hasValue ? variableMap[key] : null;
    const masked = hasValue && isSecretVariableKey(key);
    variables.push({
      key,
      status: hasValue ? 'resolved' : 'missing',
      resolvedValue,
      masked,
    });
  }

  for (const variable of environment?.variables ?? []) {
    const key = variable.key.trim();
    if (!key || referencedSet.has(key)) continue;
    const masked = isSecretVariableKey(key);
    variables.push({
      key,
      status: 'unused',
      resolvedValue: variable.value,
      masked,
    });
  }

  const missingVariables = variables
    .filter((variable) => variable.status === 'missing')
    .map((variable) => variable.key);

  return {
    environmentName: environment?.name ?? null,
    variables,
    missingVariables,
    hasPlaceholders: referenced.length > 0,
  };
}

export function environmentToVariableMap(
  environment: Environment | null,
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const variable of environment?.variables ?? []) {
    const key = variable.key.trim();
    if (key) variables[key] = variable.value;
  }
  return variables;
}

export function interpolateVariables(
  input: string,
  variables: Record<string, string>,
): InterpolationResult {
  const missingVariables: string[] = [];
  const value = input.replace(VARIABLE_PATTERN, (match, variableName) => {
    if (Object.prototype.hasOwnProperty.call(variables, variableName)) {
      return variables[variableName];
    }
    missingVariables.push(variableName);
    return match;
  });

  return { value, missingVariables: unique(missingVariables) };
}

export function interpolateComposerFields({
  messages,
  systemPrompt,
  customHeaders,
  environment,
}: {
  messages: NormalizedMessage[];
  systemPrompt: string;
  customHeaders: HeaderEntry[];
  environment: Environment | null;
}): ComposerInterpolationResult {
  const variables = environmentToVariableMap(environment);
  const missingVariables: string[] = [];

  const interpolate = (input: string): string => {
    const result = interpolateVariables(input, variables);
    missingVariables.push(...result.missingVariables);
    return result.value;
  };

  return {
    messages: messages.map((message) => ({
      ...message,
      content: interpolate(message.content),
    })),
    systemPrompt: interpolate(systemPrompt),
    customHeaders: customHeaders.map((header) => ({
      ...header,
      key: interpolate(header.key),
      value: interpolate(header.value),
    })),
    missingVariables: unique(missingVariables),
  };
}
