import { getCodeGenerators } from './index';
import { makeProvider } from '@/__tests__/fixtures';

describe('getCodeGenerators', () => {
  it('returns generators for openai-compatible', () => {
    const generators = getCodeGenerators(makeProvider({ type: 'openai-compatible' }));
    expect(generators).toHaveLength(2);
    expect(generators[0].language).toBe('python');
    expect(generators[1].language).toBe('javascript');
  });

  it('returns generators for custom', () => {
    const generators = getCodeGenerators(makeProvider({ type: 'custom' }));
    expect(generators).toHaveLength(2);
  });

  it('returns empty array for anthropic', () => {
    expect(getCodeGenerators(makeProvider({ type: 'anthropic' }))).toEqual([]);
  });

  it('returns empty array for google-gemini', () => {
    expect(getCodeGenerators(makeProvider({ type: 'google-gemini' }))).toEqual([]);
  });
});
