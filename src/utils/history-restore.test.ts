import {
  buildComposerHistoryRestore,
  buildResponseHistoryRestore,
} from './history-restore';
import { makeHistoryEntry, makeRequest } from '@/__tests__/fixtures';
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_THINKING_BUDGET_TOKENS,
  DEFAULT_THINKING_ENABLED,
  DEFAULT_TOP_K,
  DEFAULT_TOP_P,
  DEFAULT_EFFORT,
  DEFAULT_VERBOSITY,
} from '@/constants/defaults';

describe('history-restore', () => {
  it('builds composer restore data with response turn appended', () => {
    const entry = makeHistoryEntry({
      request: makeRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
        thinking: { enabled: true, budgetTokens: 1234 },
        effort: 'high',
        verbosity: 'low',
      }),
      customHeaders: [{ key: 'X-Team', value: 'core' }],
    });

    expect(buildComposerHistoryRestore(entry)).toEqual(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hello there!' },
          { role: 'user', content: '' },
        ],
        systemPrompt: 'Be helpful',
        thinkingEnabled: true,
        thinkingBudgetTokens: 1234,
        effort: 'high',
        verbosity: 'low',
        customHeaders: [{ key: 'X-Team', value: 'core' }],
      }),
    );
  });

  it('uses defaults for missing optional request values', () => {
    const entry = makeHistoryEntry({
      request: makeRequest({
        temperature: undefined,
        maxTokens: undefined,
        topP: undefined,
        topK: undefined,
        thinking: undefined,
        effort: undefined,
        verbosity: undefined,
      }),
      response: null,
    });

    expect(buildComposerHistoryRestore(entry)).toEqual(
      expect.objectContaining({
        temperature: DEFAULT_TEMPERATURE,
        maxTokens: DEFAULT_MAX_TOKENS,
        topP: DEFAULT_TOP_P,
        topK: DEFAULT_TOP_K,
        thinkingEnabled: DEFAULT_THINKING_ENABLED,
        thinkingBudgetTokens: DEFAULT_THINKING_BUDGET_TOKENS,
        effort: DEFAULT_EFFORT,
        verbosity: DEFAULT_VERBOSITY,
      }),
    );
  });

  it('builds response restore data', () => {
    const entry = makeHistoryEntry({ requestUrl: undefined });

    expect(buildResponseHistoryRestore(entry)).toEqual(
      expect.objectContaining({
        messages: entry.request.messages,
        response: entry.response,
        requestUrl: null,
        temperature: entry.request.temperature,
        maxTokens: entry.request.maxTokens,
      }),
    );
  });
});
