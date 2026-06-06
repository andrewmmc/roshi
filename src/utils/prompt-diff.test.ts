import { makeHistoryEntry } from '@/__tests__/fixtures';
import { formatHistoryPrompt } from './prompt-diff';

describe('formatHistoryPrompt', () => {
  it('omits blank system prompts', () => {
    const entry = makeHistoryEntry({
      request: {
        model: 'gpt-4o-mini',
        messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
        systemPrompt: '   ',
        stream: false,
      },
    });

    expect(formatHistoryPrompt(entry)).toBe('[user]\nHello');
  });

  it('formats system prompt and role-tagged messages', () => {
    const entry = makeHistoryEntry({
      request: {
        model: 'gpt-4o-mini',
        messages: [
          { id: 'm1', role: 'user', content: 'Hello' },
          { id: 'm2', role: 'assistant', content: 'Hi there' },
        ],
        systemPrompt: 'Be concise',
        stream: false,
      },
    });

    expect(formatHistoryPrompt(entry)).toBe(
      '[system]\nBe concise\n\n[user]\nHello\n\n[assistant]\nHi there',
    );
  });
});
