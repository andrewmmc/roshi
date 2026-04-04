import { fireEvent, render, screen } from '@testing-library/react';
import { HistoryList } from './HistoryList';
import { useHistoryStore } from '@/stores/history-store';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import {
  makeHistoryEntry,
  makeModel,
  makeProvider,
} from '@/__tests__/fixtures';

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
      providers: [
        makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] }),
      ],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
    });

    useComposerStore.getState().resetComposer();
    useResponseStore.getState().resetResponse();
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

    render(<HistoryList />);

    fireEvent.click(screen.getByRole('button', { name: /hello/i }));

    expect(useComposerStore.getState().customHeaders).toEqual([
      expect.objectContaining({ key: 'Authorization', value: 'Bearer demo' }),
      expect.objectContaining({ key: 'X-Team', value: 'core' }),
    ]);
    expect(useProviderStore.getState().selectedProviderId).toBe('p1');
    expect(useProviderStore.getState().selectedModelId).toBe('m1');
  });

  it('filters entries by search and status and clears all history after confirmation', () => {
    const clearAll = vi.fn().mockResolvedValue(undefined);
    useHistoryStore.setState({
      entries: [
        makeHistoryEntry({
          id: 'ok-1',
          providerName: 'OpenAI',
          modelId: 'gpt-4o',
          error: null,
        }),
        makeHistoryEntry({
          id: 'err-1',
          providerName: 'Anthropic',
          modelId: 'claude-sonnet',
          error: 'timeout',
        }),
      ],
      clearAll,
    });

    render(<HistoryList />);

    fireEvent.change(screen.getByLabelText('Search history'), {
      target: { value: 'anthropic' },
    });
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/anthropic/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByText(/anthropic/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all history' }));
    expect(screen.getByText('Delete all history?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete all' }));

    expect(clearAll).toHaveBeenCalledTimes(1);
  });

  it('shows discard confirmation before replacing unsaved composer content', () => {
    const entry = makeHistoryEntry({
      providerId: 'p1',
      modelId: 'm1',
    });
    useHistoryStore.setState({ entries: [entry] });
    useComposerStore.setState({
      messages: [{ id: 'draft', role: 'user', content: 'unsaved draft' }],
    });
    useResponseStore.setState({ sentRequest: null });

    render(<HistoryList />);

    fireEvent.click(screen.getByRole('button', { name: /hello/i }));
    expect(screen.getByText('Discard unsent changes?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(useProviderStore.getState().selectedProviderId).toBe('p1');
  });
});
