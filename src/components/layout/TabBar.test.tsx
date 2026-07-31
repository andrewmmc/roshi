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

  it('uses roving tabindex and wraps arrow-key navigation', async () => {
    const user = userEvent.setup();
    useTabStore.getState().createTab();
    useTabStore.getState().createTab();
    const tabs = useTabStore.getState().tabs;

    render(<TabBar />);

    const tabButtons = screen.getAllByRole('tab');
    expect(tabButtons).toHaveLength(3);
    expect(tabButtons.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);

    tabButtons[2].focus();
    await user.keyboard('{ArrowRight}');

    expect(useTabStore.getState().activeTabId).toBe(tabs[0].id);
    expect(tabButtons[0]).toHaveFocus();
    expect(tabButtons.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);

    await user.keyboard('{ArrowLeft}');
    expect(useTabStore.getState().activeTabId).toBe(tabs[2].id);
    expect(tabButtons[2]).toHaveFocus();
  });

  it('supports Home and End navigation within the tab list', async () => {
    const user = userEvent.setup();
    useTabStore.getState().createTab();
    useTabStore.getState().createTab();
    const tabs = useTabStore.getState().tabs;

    render(<TabBar />);

    const tabButtons = screen.getAllByRole('tab');
    tabButtons[2].focus();
    await user.keyboard('{Home}');
    expect(useTabStore.getState().activeTabId).toBe(tabs[0].id);
    expect(tabButtons[0]).toHaveFocus();

    await user.keyboard('{End}');
    expect(useTabStore.getState().activeTabId).toBe(tabs[2].id);
    expect(tabButtons[2]).toHaveFocus();
  });
});
