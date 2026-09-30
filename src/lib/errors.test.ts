import { AppError, toErrorMessage } from './errors';

describe('toErrorMessage', () => {
  it('prefers Error and AppError messages', () => {
    expect(toErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(toErrorMessage(new AppError('CODE', 'typed'), 'fallback')).toBe(
      'typed',
    );
  });

  it('accepts non-empty strings and otherwise uses the caller fallback', () => {
    expect(toErrorMessage('plain', 'fallback')).toBe('plain');
    expect(toErrorMessage('', 'fallback')).toBe('fallback');
    expect(toErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
