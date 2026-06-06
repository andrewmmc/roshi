import {
  buildEnvironmentPreview,
  collectComposerVariableReferences,
  environmentToVariableMap,
  interpolateComposerFields,
  interpolateVariables,
  isSecretVariableKey,
  maskSecretValue,
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

  it('detects secret-like variable keys', () => {
    expect(isSecretVariableKey('API_KEY')).toBe(true);
    expect(isSecretVariableKey('openai-token')).toBe(true);
    expect(isSecretVariableKey('customer')).toBe(false);
  });

  it('masks secret values for preview', () => {
    expect(maskSecretValue('super-secret')).toMatch(/^•+$/);
  });

  it('collects variable references from composer fields', () => {
    expect(
      collectComposerVariableReferences({
        messages: [{ id: 'm1', role: 'user', content: 'Hi {{customer}}' }],
        systemPrompt: 'Tone: {{tone}}',
        customHeaders: [{ id: 'h1', key: 'X-Key', value: '{{api_key}}' }],
      }),
    ).toEqual(['customer', 'tone', 'api_key']);
  });

  it('builds an environment preview with resolved, missing, and unused vars', () => {
    const preview = buildEnvironmentPreview({
      environment: {
        ...makeEnvironment(),
        variables: [
          { id: 'v1', key: 'customer', value: 'Acme' },
          { id: 'v2', key: 'tone', value: 'warm' },
          { id: 'v3', key: 'API_KEY', value: 'sk-test' },
          { id: 'v4', key: 'unused', value: 'value' },
        ],
      },
      messages: [
        { id: 'm1', role: 'user', content: 'Hello {{customer}} {{missing}}' },
      ],
      systemPrompt: 'Use {{API_KEY}}',
      customHeaders: [],
    });

    expect(preview.missingVariables).toEqual(['missing']);
    expect(preview.variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'customer',
          status: 'resolved',
          resolvedValue: 'Acme',
          masked: false,
        }),
        expect.objectContaining({
          key: 'missing',
          status: 'missing',
          resolvedValue: null,
        }),
        expect.objectContaining({
          key: 'API_KEY',
          status: 'resolved',
          masked: true,
        }),
        expect.objectContaining({
          key: 'unused',
          status: 'unused',
        }),
      ]),
    );
  });
});
