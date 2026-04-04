import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

vi.mock('@base-ui/react/select', () => {
  const make =
    (tag: string) =>
    ({
      children,
      render,
      ...props
    }: Record<string, unknown> & {
      children?: React.ReactNode;
      render?: React.ReactNode;
    }) => {
      return React.createElement(tag, props, render ?? children);
    };

  return {
    Select: {
      Root: make('div'),
      Group: make('div'),
      Value: make('span'),
      Trigger: make('button'),
      Icon: make('span'),
      Portal: ({ children }: { children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
      Positioner: make('div'),
      Popup: make('div'),
      List: make('div'),
      GroupLabel: make('div'),
      Item: make('div'),
      ItemText: make('span'),
      ItemIndicator: make('span'),
      Separator: make('div'),
      ScrollUpArrow: make('button'),
      ScrollDownArrow: make('button'),
    },
  };
});

describe('select wrappers', () => {
  it('renders trigger, value, item, and label slots', () => {
    render(
      <>
        <SelectGroup className="group-class" />
        <SelectValue>Value</SelectValue>
        <SelectTrigger size="sm">Trigger</SelectTrigger>
        <SelectLabel>Label</SelectLabel>
        <SelectItem value="one">One</SelectItem>
        <SelectSeparator className="sep" />
      </>,
    );

    expect(
      screen.getByText('Value').closest('[data-slot="select-value"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Trigger').closest('[data-slot="select-trigger"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Label').closest('[data-slot="select-label"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('One').closest('[data-slot="select-item"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="select-separator"]'),
    ).toHaveClass('sep');
  });

  it('renders content and scroll buttons', () => {
    render(
      <>
        <SelectContent side="top">Body</SelectContent>
        <SelectScrollUpButton />
        <SelectScrollDownButton />
      </>,
    );

    expect(
      screen.getByText('Body').closest('[data-slot="select-content"]'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Scroll up' })[0],
    ).toHaveAttribute('data-slot', 'select-scroll-up-button');
    expect(
      screen.getAllByRole('button', { name: 'Scroll down' })[0],
    ).toHaveAttribute('data-slot', 'select-scroll-down-button');
  });
});
