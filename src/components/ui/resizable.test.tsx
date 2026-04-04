import { render, screen } from '@testing-library/react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './resizable';

vi.mock('react-resizable-panels', () => ({
  Group: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { orientation?: string }) => (
    <div data-testid="group" {...props}>
      {children}
    </div>
  ),
  Panel: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="panel" {...props} />
  ),
  Separator: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { withHandle?: boolean }) => (
    <div data-testid="separator" {...props}>
      {children}
    </div>
  ),
}));

describe('resizable wrappers', () => {
  it('renders panel group and panel slots', () => {
    render(
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel>Body</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('group')).toHaveAttribute(
      'data-slot',
      'resizable-panel-group',
    );
    expect(screen.getByTestId('panel')).toHaveAttribute(
      'data-slot',
      'resizable-panel',
    );
  });

  it('renders the resize handle grip when requested', () => {
    render(<ResizableHandle withHandle />);

    expect(screen.getByTestId('separator')).toHaveAttribute(
      'data-slot',
      'resizable-handle',
    );
    expect(screen.getByTestId('separator').firstChild).toBeInTheDocument();
  });
});
