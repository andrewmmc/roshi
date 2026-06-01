import type { Environment } from '@/types/history';
import type { HeaderEntry } from '@/utils/headers';
import type { NormalizedMessage } from '@/types/normalized';

const VARIABLE_PATTERN = /{{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*}}/g;

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

function unique(values: string[]): string[] {
  return [...new Set(values)];
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
