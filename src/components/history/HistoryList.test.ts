import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HistoryList } from './HistoryList';
import { useHistoryStore } from '@/stores/history-store';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeHistoryEntry, makeModel, makeProvider } from '@/__tests__/fixtures';

describe('HistoryList', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      entries: [],
      loaded: true,
      load: vi.fn().mockResolvedValue(undefined),
      addEntry: vi.fn(),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      clearAll: vi.fn().mockResolvedValue(undefined),
    });

    useProviderStore.setState({
      providers: [makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] })],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
    });

    useRequestStore.getState().reset();
  });

  it('restores custom headers when selecting a history entry', () => {
    const entry = makeHistoryEntry({
      providerId: 'p1',
      modelId: 'm1',
      customHeaders: [
        { key: 'Authorization', value: 'Bearer demo' },
        { key: 'X-Team', value: 'core' },
      ],
    });

    useHistoryStore.setState({ entries: [entry] });

    render(React.createElement(HistoryList));

    fireEvent.click(screen.getByRole('button', { name: /hello/i }));

    expect(useRequestStore.getState().customHeaders).toEqual([
      expect.objectContaining({ key: 'Authorization', value: 'Bearer demo' }),
      expect.objectContaining({ key: 'X-Team', value: 'core' }),
    ]);
    expect(useProviderStore.getState().selectedProviderId).toBe('p1');
    expect(useProviderStore.getState().selectedModelId).toBe('m1');
  });
});
