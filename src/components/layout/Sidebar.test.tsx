import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useUiStore } from '@/stores/ui-store';

vi.mock('@/components/settings', () => ({
  SettingsDialog: () => <div>SettingsDialog Mock</div>,
}));

vi.mock('@/components/history/HistoryList', () => ({
  HistoryList: () => <div>HistoryList Mock</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
    useResponseStore.getState().resetResponse();
    useUiStore.setState({ aboutOpen: false });
  });

  it('opens the about dialog', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Roshi' }));

    expect(useUiStore.getState().aboutOpen).toBe(true);
  });

  it('resets immediately when there are no unsaved changes', () => {
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'draft' }],
    });
    useResponseStore.setState({
      sentRequest: {
        messages: [{ role: 'user', content: 'draft' }],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      error: 'oops',
    });

    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'New request' }));

    expect(useComposerStore.getState().messages[0].content).toBe('');
    expect(useResponseStore.getState().error).toBeNull();
  });

  it('opens the discard dialog when there are unsaved changes', () => {
    useComposerStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'draft' }],
    });

    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'New request' }));

    expect(screen.getByText('Discard unsent changes?')).toBeInTheDocument();
  });
});
