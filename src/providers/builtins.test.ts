import { builtinProviders } from './builtins';

describe('builtinProviders', () => {
  it('has 4 providers', () => {
    expect(builtinProviders).toHaveLength(4);
  });

  it('all have isBuiltIn true', () => {
    expect(builtinProviders.every((p) => p.isBuiltIn)).toBe(true);
  });

  it('all have empty models array', () => {
    expect(builtinProviders.every((p) => p.models.length === 0)).toBe(true);
  });

  it('all have required fields', () => {
    for (const p of builtinProviders) {
      expect(p.name).toBeTruthy();
      expect(p.type).toBeTruthy();
      expect(p.baseUrl).toBeTruthy();
      expect(p.auth).toBeDefined();
      expect(p.endpoints.chat).toBeTruthy();
    }
  });

  it('includes OpenAI with correct config', () => {
    const openai = builtinProviders.find((p) => p.name === 'OpenAI');
    expect(openai?.baseUrl).toBe('https://api.openai.com/v1');
    expect(openai?.auth.type).toBe('bearer');
    expect(openai?.type).toBe('openai-compatible');
  });

  it('includes Anthropic with correct config', () => {
    const anthropic = builtinProviders.find((p) => p.name === 'Anthropic');
    expect(anthropic?.baseUrl).toBe('https://api.anthropic.com/v1');
    expect(anthropic?.auth.type).toBe('api-key-header');
    expect(anthropic?.type).toBe('anthropic');
    expect(anthropic?.endpoints.chat).toBe('/messages');
  });

  it('includes OpenRouter with correct config', () => {
    const openrouter = builtinProviders.find((p) => p.name === 'OpenRouter');
    expect(openrouter?.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(openrouter?.auth.type).toBe('bearer');
  });
});
