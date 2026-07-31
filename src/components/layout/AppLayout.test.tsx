import { act, render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';
import { useUiStore } from '@/stores/ui-store';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <button>Sidebar action</button>,
}));

vi.mock('./MainPanel', () => ({
  MainPanel: () => <button data-open-sidebar>Open sidebar mock</button>,
}));

vi.mock('./AppBanner', () => ({
  AppBanner: () => <div>AppBanner Mock</div>,
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => <div />,
}));

describe('AppLayout', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false });
  });

  it('renders the skip link, sidebar, and main content regions', () => {
    render(<AppLayout />);

    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByText('AppBanner Mock')).toBeInTheDocument();
    expect(screen.getByText('Sidebar action')).toBeInTheDocument();
    expect(screen.getByText('Open sidebar mock')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('removes a collapsed sidebar from focus and accessibility navigation', () => {
    useUiStore.setState({ sidebarCollapsed: true });

    render(<AppLayout />);

    const aside = screen.getByRole('complementary', { hidden: true });
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside).toHaveAttribute('inert');
  });

  it('moves focus to the open-sidebar control after collapsing', () => {
    render(<AppLayout />);
    screen.getByRole('button', { name: 'Sidebar action' }).focus();

    act(() => useUiStore.setState({ sidebarCollapsed: true }));

    expect(
      screen.getByRole('button', { name: 'Open sidebar mock' }),
    ).toHaveFocus();
  });
});
