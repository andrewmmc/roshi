import {
  environmentToVariableMap,
  interpolateComposerFields,
  interpolateVariables,
} from './variables';
import type { Environment } from '@/types/history';

function makeEnvironment(): Environment {
  return {
    id: 'env-1',
    name: 'Local',
    variables: [
      { id: 'v1', key: 'customer', value: 'Acme' },
      { id: 'v2', key: 'tone', value: 'warm' },
    ],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };
}

describe('variables', () => {
  it('turns an environment into a variable map', () => {
    expect(environmentToVariableMap(makeEnvironment())).toEqual({
      customer: 'Acme',
      tone: 'warm',
    });
  });

  it('interpolates variables and reports missing placeholders', () => {
    const result = interpolateVariables(
      'Write to {{ customer }} with {{missing}} and {{missing}}.',
      { customer: 'Acme' },
    );

    expect(result.value).toBe(
      'Write to Acme with {{missing}} and {{missing}}.',
    );
    expect(result.missingVariables).toEqual(['missing']);
  });

  it('interpolates composer messages, system prompts, and headers', () => {
    const result = interpolateComposerFields({
      environment: makeEnvironment(),
      messages: [{ id: 'm1', role: 'user', content: 'Hello {{customer}}' }],
      systemPrompt: 'Use a {{tone}} tone',
      customHeaders: [{ id: 'h1', key: 'X-{{customer}}', value: '{{tone}}' }],
    });

    expect(result.messages[0].content).toBe('Hello Acme');
    expect(result.systemPrompt).toBe('Use a warm tone');
    expect(result.customHeaders[0]).toMatchObject({
      key: 'X-Acme',
      value: 'warm',
    });
    expect(result.missingVariables).toEqual([]);
  });
});
