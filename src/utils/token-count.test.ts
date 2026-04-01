import { estimateTokenCount } from './token-count';
import type { NormalizedMessage } from '@/types/normalized';

describe('estimateTokenCount', () => {
  it('returns 0 for empty messages and no system prompt', async () => {
    const count = await estimateTokenCount([], '');
    expect(count).toBe(0);
  });

  it('returns 0 when all user messages are blank', async () => {
    const messages: NormalizedMessage[] = [{ role: 'user', content: '   ' }];
    const count = await estimateTokenCount(messages, '');
    expect(count).toBe(0);
  });

  it('counts tokens for a single user message', async () => {
    const messages: NormalizedMessage[] = [
      { role: 'user', content: 'Hello, world!' },
    ];
    const count = await estimateTokenCount(messages, '');
    expect(count).toBeGreaterThan(0);
  });

  it('includes system prompt tokens in the count', async () => {
    const messages: NormalizedMessage[] = [{ role: 'user', content: 'Hi' }];
    const withoutSystem = await estimateTokenCount(messages, '');
    const withSystem = await estimateTokenCount(
      messages,
      'You are a helpful assistant that speaks only in haiku.',
    );
    expect(withSystem).toBeGreaterThan(withoutSystem);
  });

  it('counts tokens for multi-turn conversations', async () => {
    const single: NormalizedMessage[] = [{ role: 'user', content: 'Hello' }];
    const multi: NormalizedMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there! How can I help you today?' },
      { role: 'user', content: 'Tell me a joke.' },
    ];
    const singleCount = await estimateTokenCount(single, '');
    const multiCount = await estimateTokenCount(multi, '');
    expect(multiCount).toBeGreaterThan(singleCount);
  });

  it('produces a reasonable estimate for a known string', async () => {
    const messages: NormalizedMessage[] = [
      { role: 'user', content: 'The quick brown fox jumps over the lazy dog.' },
    ];
    const count = await estimateTokenCount(messages, '');
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThan(50);
  });
});
