export const IS_MAC =
  typeof navigator !== 'undefined'
    ? /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? navigator.userAgent)
    : false;

export function modKey(): string {
  return IS_MAC ? '⌘' : 'Ctrl';
}

export function formatShortcut(mac: string, other: string): string {
  return IS_MAC ? mac : other;
}
