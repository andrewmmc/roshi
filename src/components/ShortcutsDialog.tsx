import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { IS_MAC } from '@/lib/platform';
import { useUiStore } from '@/stores/ui-store';

interface ShortcutRow {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  label: string;
  rows: ShortcutRow[];
}

const MAC_SECTIONS: ShortcutSection[] = [
  {
    label: 'Requests',
    rows: [
      { keys: ['⌘', '↵'], description: 'Send request / run eval' },
      { keys: ['Esc'], description: 'Cancel running request / eval' },
      { keys: ['⌘', '⇧', 'N'], description: 'New request' },
    ],
  },
  {
    label: 'Composer',
    rows: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', 'P'], description: 'Search history' },
      { keys: ['⌘', '⇧', ','], description: 'Open settings' },
    ],
  },
  {
    label: 'Tabs',
    rows: [
      { keys: ['⌘K', '→', 'New Tab'], description: 'Open new tab' },
      { keys: ['⌘K', '→', 'Duplicate Tab'], description: 'Duplicate tab' },
    ],
  },
  {
    label: 'View',
    rows: [
      { keys: ['⌥', 'T'], description: 'Toggle dark/light theme' },
      { keys: ['⌥', 'C'], description: 'Copy response to clipboard' },
      { keys: ['?'], description: 'Show this dialog' },
    ],
  },
];

const WIN_SECTIONS: ShortcutSection[] = [
  {
    label: 'Requests',
    rows: [
      { keys: ['Ctrl', 'Enter'], description: 'Send request / run eval' },
      { keys: ['Esc'], description: 'Cancel running request / eval' },
      { keys: ['Ctrl', 'Shift', 'N'], description: 'New request' },
    ],
  },
  {
    label: 'Composer',
    rows: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Ctrl', 'P'], description: 'Search history' },
      { keys: ['Ctrl', 'Shift', ','], description: 'Open settings' },
    ],
  },
  {
    label: 'Tabs',
    rows: [
      { keys: ['Ctrl+K', '→', 'New Tab'], description: 'Open new tab' },
      { keys: ['Ctrl+K', '→', 'Duplicate Tab'], description: 'Duplicate tab' },
    ],
  },
  {
    label: 'View',
    rows: [
      { keys: ['Alt', 'T'], description: 'Toggle dark/light theme' },
      { keys: ['Alt', 'C'], description: 'Copy response to clipboard' },
      { keys: ['?'], description: 'Show this dialog' },
    ],
  },
];

const SECTIONS = IS_MAC ? MAC_SECTIONS : WIN_SECTIONS;

function KbdSequence({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && k !== '→' && (
            <span className="text-muted-foreground text-[11px]">+</span>
          )}
          {k === '→' ? (
            <span className="text-muted-foreground mx-0.5 text-[11px]">→</span>
          ) : (
            <Kbd>{k}</Kbd>
          )}
        </span>
      ))}
    </span>
  );
}

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                {section.label}
              </span>
              <div className="flex flex-col gap-1">
                {section.rows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-foreground text-xs">
                      {row.description}
                    </span>
                    <KbdSequence keys={row.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
