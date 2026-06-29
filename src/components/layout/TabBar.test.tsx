import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabBar } from './TabBar';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useTabStore } from '@/stores/tab-store';

function resetTabs() {
  useComposerStore.setState(useComposerStore.getInitialState(), true);
  useResponseStore.setState(useResponseStore.getInitialState(), true);
  useTabStore.setState(useTabStore.getInitialState(), true);
}

describe('TabBar', () => {
  beforeEach(() => {
    resetTabs();
  });

  it('uses keyboard-accessible close buttons for request tabs', async () => {
    const user = userEvent.setup();
    useTabStore.getState().createTab();

    render(<TabBar />);

    const closeButtons = screen.getAllByRole('button', { name: /close tab/i });
    closeButtons[0].focus();

    expect(closeButtons[0]).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(useTabStore.getState().tabs).toHaveLength(1);
  });
});
