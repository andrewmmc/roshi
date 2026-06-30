import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useComposerStore } from '@/stores/composer-store';
import { useEvalStore } from '@/stores/eval-store';
import { useResponseStore } from '@/stores/response-store';
import { useUiStore } from '@/stores/ui-store';

vi.mock('@/components/settings', () => ({
  SettingsDialog: () => <div>SettingsDialog Mock</div>,
}));

vi.mock('@/components/history/HistoryList', () => ({
  HistoryList: ({ headerSlot }: { headerSlot?: ReactNode }) => (
    <div>
      {headerSlot}
      <div>HistoryList Mock</div>
    </div>
  ),
}));

vi.mock('@/components/collections/CollectionsList', () => ({
  CollectionsList: ({ headerSlot }: { headerSlot?: ReactNode }) => (
    <div>
      {headerSlot}
      <div>CollectionsList Mock</div>
    </div>
  ),
}));

vi.mock('@/components/eval/EvalRunsList', () => ({
  EvalRunsList: ({ headerSlot }: { headerSlot?: ReactNode }) => (
    <div>
      {headerSlot}
      <div>EvalRunsList Mock</div>
    </div>
  ),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    useComposerStore.getState().resetComposer();
    useEvalStore.getState().reset();
    useResponseStore.getState().resetResponse();
    useUiStore.setState({
      aboutOpen: false,
      mainView: 'request',
      sidebarSection: 'history',
    });
  });

  it('shows request sidebar sections in request view', () => {
    useUiStore.setState({ mainView: 'request', sidebarSection: 'history' });

    render(<Sidebar />);

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.queryByText('Evals')).not.toBeInTheDocument();
    expect(screen.getByText('HistoryList Mock')).toBeInTheDocument();
  });

  it('shows eval runs in eval view', () => {
    useUiStore.setState({ mainView: 'eval', sidebarSection: 'history' });

    render(<Sidebar />);

    expect(screen.getByText('Evals')).toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.queryByText('Collections')).not.toBeInTheDocument();
    expect(screen.getByText('EvalRunsList Mock')).toBeInTheDocument();
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

  it('resets eval state after confirming discard in eval view', () => {
    useUiStore.setState({ mainView: 'eval', sidebarSection: 'evals' });
    useEvalStore.getState().setSystemPrompt('compare this');
    useEvalStore.getState().updateMessage(0, { content: 'prompt' });
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'm1' });

    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'New request' }));

    expect(screen.getByText('Discard current eval?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(useEvalStore.getState().composer.systemPrompt).toBe('');
    expect(useEvalStore.getState().composer.messages[0].content).toBe('');
    expect(useEvalStore.getState().runners).toEqual([]);
  });
});
