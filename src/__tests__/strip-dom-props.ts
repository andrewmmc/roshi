const NON_DOM_PROPS = new Set([
  'align',
  'alignItemWithTrigger',
  'alignOffset',
  'checked',
  'defaultValue',
  'delay',
  'inset',
  'onOpenChange',
  'onValueChange',
  'open',
  'render',
  'side',
  'sideOffset',
  'thumbAlignment',
  'value',
  'variant',
]);

export function stripNonDomProps<T extends object>(props: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!NON_DOM_PROPS.has(key)) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}
