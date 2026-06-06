import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { useUiStore } from '@/stores/ui-store';
import { useToastStore } from '@/stores/toast-store';

const { exportHistory } = vi.hoisted(() => ({
  exportHistory: vi.fn(),
}));

vi.mock('@/utils/export', () => ({
  exportHistory,
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    providers: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    collections: {
      toArray: vi.fn().mockResolvedValue([]),
    },
    savedRequests: {
      toArray: vi.fn().mockResolvedValue([]),
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
vi.mock('@/db', () => ({ db: mockDb }));

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
    useUiStore.setState({ historySearchFocusGen: 0 });
    useToastStore.setState({ toasts: [] });
    exportHistory.mockReset();
    mockDb.providers.update.mockClear();
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

  it('filters entries by search and clears all history after confirmation', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByLabelText('Search history')).toHaveValue('');
    expect(screen.getByText(/openai/i)).toBeInTheDocument();
    expect(screen.getByText(/anthropic/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all history' }));
    expect(screen.getByText('Delete all history?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(clearAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete all' }));

    expect(clearAll).toHaveBeenCalledTimes(1);
  });

  it('exports history and shows no matching entries', () => {
    const entries = [
      makeHistoryEntry({ id: 'ok-1', providerName: 'OpenAI', error: null }),
    ];
    useHistoryStore.setState({ entries });

    render(<HistoryList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Export all history as JSON' }),
    );
    expect(exportHistory).toHaveBeenCalledWith(entries);

    fireEvent.change(screen.getByLabelText('Search history'), {
      target: { value: 'missing' },
    });
    expect(screen.getByText('No matching entries')).toBeInTheDocument();
  });

  it('focuses the search input when focus generation changes', () => {
    useHistoryStore.setState({ entries: [makeHistoryEntry()] });
    useUiStore.setState({ historySearchFocusGen: 1 });
    const focus = vi.spyOn(HTMLInputElement.prototype, 'focus');
    const select = vi.spyOn(HTMLInputElement.prototype, 'select');

    render(<HistoryList />);

    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
  });

  it('warns when restoring history with a deleted provider', () => {
    const entry = makeHistoryEntry({
      providerId: 'missing-provider',
      modelId: 'missing-model',
      providerName: 'Old Provider',
    });
    useHistoryStore.setState({ entries: [entry] });

    render(<HistoryList />);
    fireEvent.click(screen.getByRole('button', { name: /hello/i }));

    expect(useProviderStore.getState().selectedProviderId).toBeNull();
    expect(useComposerStore.getState().messages.length).toBeGreaterThan(0);
    expect(useToastStore.getState().toasts[0]?.message).toBe(
      'Original provider/model is no longer configured.',
    );
  });

  it('restores missing model to provider and warns when only model was deleted', async () => {
    const entry = makeHistoryEntry({
      providerId: 'p1',
      modelId: 'custom-model',
      providerName: 'OpenAI',
    });
    useHistoryStore.setState({ entries: [entry] });

    render(<HistoryList />);
    fireEvent.click(screen.getByRole('button', { name: /hello/i }));

    await waitFor(() => {
      expect(mockDb.providers.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({
          models: expect.arrayContaining([
            expect.objectContaining({ id: 'custom-model', source: 'manual' }),
          ]),
        }),
      );
    });
    await waitFor(() => {
      expect(useProviderStore.getState().selectedModelId).toBe('custom-model');
    });
    expect(useToastStore.getState().toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Added "custom-model" back to OpenAI.',
        }),
        expect.objectContaining({
          message:
            'Original model "custom-model" is no longer configured for OpenAI.',
        }),
      ]),
    );
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
