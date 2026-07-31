import { render, screen } from '@testing-library/react';
import { ShortcutsDialog } from './ShortcutsDialog';
import { useUiStore } from '@/stores/ui-store';

describe('ShortcutsDialog', () => {
  beforeEach(() => {
    useUiStore.setState({ shortcutsOpen: true, mainView: 'request' });
  });

  it('documents the direct request-tab shortcuts', async () => {
    render(<ShortcutsDialog />);

    expect(await screen.findByText('Open new tab')).toBeInTheDocument();
    expect(screen.getByText('Close active tab')).toBeInTheDocument();
    expect(screen.getByText('Duplicate active tab')).toBeInTheDocument();
    expect(screen.getByText('Next tab')).toBeInTheDocument();
    expect(screen.getByText('Previous tab')).toBeInTheDocument();
  });

  it('hides request-tab shortcuts in eval mode', async () => {
    useUiStore.setState({ mainView: 'eval' });
    render(<ShortcutsDialog />);

    expect(await screen.findByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.queryByText('Open new tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Next tab')).not.toBeInTheDocument();
  });
});
