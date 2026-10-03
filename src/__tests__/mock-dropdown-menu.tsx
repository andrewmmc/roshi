import type { ButtonHTMLAttributes, ReactNode } from 'react';

function DropdownMenu({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function DropdownMenuTrigger({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button {...props}>{children}</button>;
}

function DropdownMenuContent({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function DropdownMenuItem({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function DropdownMenuSeparator() {
  return <hr />;
}

function DropdownMenuSub({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function DropdownMenuSubTrigger({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  );
}

function DropdownMenuSubContent({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
