import React from 'react';

function SelectItem({
  value,
  children,
  title,
}: {
  value: string;
  children?: React.ReactNode;
  title?: string;
}) {
  return (
    <option value={value} title={title}>
      {children}
    </option>
  );
}

function isSelectItem(
  child: React.ReactNode,
): child is React.ReactElement<{ value: string; children?: React.ReactNode }> {
  return React.isValidElement(child) && child.type === SelectItem;
}

function collectOptions(children: React.ReactNode): React.ReactNode[] {
  const options: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return;
    }

    if (isSelectItem(child)) {
      options.push(child);
      return;
    }

    if (child.props.children) {
      options.push(...collectOptions(child.props.children));
    }
  });

  return options;
}

function getTriggerMeta(children: React.ReactNode): {
  id?: string;
  ariaLabel?: string;
} {
  let id: string | undefined;
  let ariaLabel: string | undefined;

  React.Children.forEach(children, (child) => {
    if (
      !React.isValidElement<{
        id?: string;
        'aria-label'?: string;
        children?: React.ReactNode;
      }>(child)
    ) {
      return;
    }

    if (child.props.id) {
      id = child.props.id;
    }
    if (child.props['aria-label']) {
      ariaLabel = child.props['aria-label'];
    }
  });

  return { id, ariaLabel };
}

function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { id, ariaLabel } = getTriggerMeta(children);

  return (
    <select
      id={id}
      role="combobox"
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {collectOptions(children)}
    </select>
  );
}

function SelectTrigger() {
  return null;
}

function SelectContent() {
  return null;
}

function SelectValue() {
  return null;
}

function SelectSeparator() {
  return null;
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectValue,
};
