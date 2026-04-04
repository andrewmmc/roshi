import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

vi.mock('./Sidebar', () => ({
  Sidebar: () => React.createElement('div', null, 'Sidebar Mock'),
}));

vi.mock('./MainPanel', () => ({
  MainPanel: () => React.createElement('div', null, 'MainPanel Mock'),
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  ResizablePanel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  ResizableHandle: () => React.createElement('div'),
}));

describe('AppLayout', () => {
  it('renders the skip link, sidebar, and main content regions', () => {
    render(React.createElement(AppLayout));

    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByText('Sidebar Mock')).toBeInTheDocument();
    expect(screen.getByText('MainPanel Mock')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});
