import {
  makeHistoryEntry,
  makeRequest,
  makeMessage,
} from '@/__tests__/fixtures';
import {
  buildHistoryModelOptions,
  buildHistoryProviderOptions,
  DEFAULT_HISTORY_FILTERS,
  filterHistoryEntries,
  isDefaultHistoryFilters,
} from './history-filter';

describe('history-filter', () => {
  const entries = [
    makeHistoryEntry({
      id: 'success',
      providerId: 'openai',
      providerName: 'OpenAI',
      modelId: 'gpt-4.1',
      collectionId: 'collection-1',
      savedRequestId: 'request-1',
      requestUrl: 'https://api.openai.test/chat',
      requestHeaders: { 'X-Tenant': 'ignored-value' },
      customHeaders: [{ key: 'X-Trace', value: 'hidden' }],
      request: makeRequest({
        systemPrompt: 'Reply like a product expert',
        messages: [
          makeMessage({ content: 'Summarize the quarterly roadmap' }),
          makeMessage({ role: 'assistant', content: 'Prior answer' }),
        ],
      }),
      response: {
        id: 'r1',
        model: 'gpt-4.1',
        content: 'Roadmap summary response',
        role: 'assistant',
        finishReason: 'stop',
        usage: null,
      },
      statusCode: 200,
      createdAt: new Date('2025-03-10T12:00:00Z'),
    }),
    makeHistoryEntry({
      id: 'error',
      providerId: 'anthropic',
      providerName: 'Anthropic',
      modelId: 'claude-sonnet',
      error: 'Provider returned HTTP 429: rate limited',
      response: null,
      statusCode: 429,
      createdAt: new Date('2025-03-01T12:00:00Z'),
    }),
  ];

  it('searches expanded history fields', () => {
    expect(
      filterHistoryEntries(entries, {
        ...DEFAULT_HISTORY_FILTERS,
        searchQuery: 'product expert',
      }).map((entry) => entry.id),
    ).toEqual(['success']);

    expect(
      filterHistoryEntries(entries, {
        ...DEFAULT_HISTORY_FILTERS,
        searchQuery: 'rate limited',
      }).map((entry) => entry.id),
    ).toEqual(['error']);

    expect(
      filterHistoryEntries(entries, {
        ...DEFAULT_HISTORY_FILTERS,
        searchQuery: 'x-tenant',
      }).map((entry) => entry.id),
    ).toEqual(['success']);
  });

  it('filters by status, provider, model, status code class, and collections', () => {
    const result = filterHistoryEntries(entries, {
      ...DEFAULT_HISTORY_FILTERS,
      status: 'success',
      providerId: 'openai',
      modelId: 'gpt-4.1',
      statusCodeClass: '2xx',
      collectionId: 'collection-1',
      savedRequestId: 'request-1',
    });

    expect(result.map((entry) => entry.id)).toEqual(['success']);
  });

  it('filters by quick date ranges', () => {
    const result = filterHistoryEntries(
      entries,
      { ...DEFAULT_HISTORY_FILTERS, dateRange: '7d' },
      new Date('2025-03-12T00:00:00Z'),
    );

    expect(result.map((entry) => entry.id)).toEqual(['success']);
  });

  it('builds provider and model filter options from history entries', () => {
    expect(buildHistoryProviderOptions(entries)).toEqual([
      { id: 'anthropic', name: 'Anthropic' },
      { id: 'openai', name: 'OpenAI' },
    ]);
    expect(buildHistoryModelOptions(entries)).toEqual([
      'claude-sonnet',
      'gpt-4.1',
    ]);
  });

  it('detects active filters', () => {
    expect(isDefaultHistoryFilters(DEFAULT_HISTORY_FILTERS)).toBe(true);
    expect(
      isDefaultHistoryFilters({
        ...DEFAULT_HISTORY_FILTERS,
        statusCodeClass: '4xx',
      }),
    ).toBe(false);
  });
});
