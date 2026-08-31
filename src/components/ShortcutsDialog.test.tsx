import { render, screen } from '@testing-library/react';
import { ShortcutsDialog } from './ShortcutsDialog';
import { useUiStore } from '@/stores/ui-store';
import { useLanguageStore } from '@/stores/language-store';

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

  it('translates shortcut sections and descriptions in Traditional Chinese', async () => {
    useLanguageStore.getState().setLanguage('zh-TW');
    render(<ShortcutsDialog />);

    expect(await screen.findByText('鍵盤快速鍵')).toBeInTheDocument();
    expect(screen.getByText('開啟新分頁')).toBeInTheDocument();
    expect(screen.getByText('複製目前分頁')).toBeInTheDocument();
    expect(screen.getByText('傳送請求／執行評測')).toBeInTheDocument();
  });
});
