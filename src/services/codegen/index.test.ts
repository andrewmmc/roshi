import { getCodeGenerators } from './index';
import { makeProvider } from '@/__tests__/fixtures';

describe('getCodeGenerators', () => {
  it('returns generators for openai-compatible', () => {
    const generators = getCodeGenerators(
      makeProvider({ type: 'openai-compatible' }),
    );
    expect(generators).toHaveLength(2);
    expect(generators[0].language).toBe('python');
    expect(generators[1].language).toBe('javascript');
  });

  it('returns generators for openai-compatible', () => {
    const generators = getCodeGenerators(
      makeProvider({ type: 'openai-compatible' }),
    );
    expect(generators).toHaveLength(2);
  });

  it('returns generators for anthropic', () => {
    const generators = getCodeGenerators(makeProvider({ type: 'anthropic' }));
    expect(generators).toHaveLength(2);
    expect(generators[0].language).toBe('python');
    expect(generators[1].language).toBe('javascript');
  });

  it('returns generators for google-gemini', () => {
    const generators = getCodeGenerators(
      makeProvider({ type: 'google-gemini' }),
    );
    expect(generators).toHaveLength(2);
    expect(generators[0].language).toBe('python');
    expect(generators[1].language).toBe('javascript');
  });
});
