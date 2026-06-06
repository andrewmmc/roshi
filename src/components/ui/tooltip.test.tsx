import React from 'react';
import { render, screen } from '@testing-library/react';
import { stripNonDomProps } from '@/__tests__/strip-dom-props';
import {
  KbdShortcut,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

vi.mock('@base-ui/react/tooltip', () => {
  const make =
    (tag: string) =>
    ({
      children,
      render,
      ...props
    }: Record<string, unknown> & {
      children?: React.ReactNode;
      render?: React.ReactNode;
    }) =>
      React.createElement(tag, stripNonDomProps(props), render ?? children);

  return {
    Tooltip: {
      Provider: make('div'),
      Root: make('div'),
      Trigger: make('button'),
      Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Positioner: make('div'),
      Popup: make('div'),
    },
  };
});

describe('tooltip wrappers', () => {
  it('renders provider, trigger, content, and keyboard shortcut', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="custom-class">
            Content
          </TooltipContent>
        </Tooltip>
        <KbdShortcut mac="⌘K" win="Ctrl+K" />
      </TooltipProvider>,
    );

    expect(screen.getByText('Trigger')).toHaveAttribute(
      'data-slot',
      'tooltip-trigger',
    );
    expect(screen.getByText('Content')).toHaveAttribute(
      'data-slot',
      'tooltip-content',
    );
    expect(screen.getByText('Content')).toHaveClass('custom-class');
    expect(screen.getAllByText(/⌘|K|Ctrl/).length).toBeGreaterThan(0);
  });
});
