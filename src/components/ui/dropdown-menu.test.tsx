import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

vi.mock('@base-ui/react/menu', () => {
  const make =
    (tag: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) => {
      return React.createElement(tag, props, children);
    };

  return {
    Menu: {
      Root: make('div'),
      Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Trigger: make('button'),
      Positioner: make('div'),
      Popup: make('div'),
      Group: make('div'),
      GroupLabel: make('div'),
      Item: make('div'),
      SubmenuRoot: make('div'),
      SubmenuTrigger: make('button'),
      CheckboxItem: make('div'),
      CheckboxItemIndicator: make('span'),
      RadioGroup: make('div'),
      RadioItem: make('div'),
      RadioItemIndicator: make('span'),
      Separator: make('div'),
    },
  };
});

describe('dropdown-menu wrappers', () => {
  it('renders core slots and submenu wrappers', () => {
    render(
      <>
        <DropdownMenu />
        <DropdownMenuPortal>Portal</DropdownMenuPortal>
        <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
        <DropdownMenuContent>Content</DropdownMenuContent>
        <DropdownMenuGroup>Group</DropdownMenuGroup>
        <DropdownMenuLabel inset>Label</DropdownMenuLabel>
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        <DropdownMenuSub />
        <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>Subcontent</DropdownMenuSubContent>
        <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup>RadioGroup</DropdownMenuRadioGroup>
        <DropdownMenuRadioItem value="one">RadioItem</DropdownMenuRadioItem>
        <DropdownMenuSeparator />
        <DropdownMenuShortcut>Cmd+K</DropdownMenuShortcut>
      </>,
    );

    expect(
      document.querySelector('[data-slot="dropdown-menu"]'),
    ).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-trigger',
    );
    expect(screen.getByText('Content')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-content',
    );
    expect(screen.getByText('Delete')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-item',
    );
    expect(screen.getByText('More')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-sub-trigger',
    );
    expect(screen.getByText('Subcontent')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-sub-content',
    );
    expect(screen.getByText('Cmd+K')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-shortcut',
    );
  });
});
