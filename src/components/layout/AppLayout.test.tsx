import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div>Sidebar Mock</div>,
}));

vi.mock('./MainPanel', () => ({
  MainPanel: () => <div>MainPanel Mock</div>,
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
  it('renders the skip link, sidebar, and main content regions', () => {
    render(<AppLayout />);

    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByText('Sidebar Mock')).toBeInTheDocument();
    expect(screen.getByText('MainPanel Mock')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});
