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
import { useTranslation, type MessageKey } from '@/i18n';

interface ShortcutRow {
  keys: string[];
  descriptionKey: MessageKey;
  /** Only relevant in request mode (hidden while the eval workspace is active). */
  requestOnly?: boolean;
}

interface ShortcutSection {
  labelKey: MessageKey;
  rows: ShortcutRow[];
  /** Only relevant in request mode (hidden while the eval workspace is active). */
  requestOnly?: boolean;
}

const MAC_SECTIONS: ShortcutSection[] = [
  {
    labelKey: 'navigation.shortcutRequests',
    rows: [
      { keys: ['⌘', '↵'], descriptionKey: 'navigation.shortcutSend' },
      { keys: ['Esc'], descriptionKey: 'navigation.shortcutCancel' },
      {
        keys: ['⌘', '⇧', 'N'],
        descriptionKey: 'navigation.shortcutNewRequest',
      },
    ],
  },
  {
    labelKey: 'navigation.shortcutComposer',
    rows: [
      {
        keys: ['⌘', 'K'],
        descriptionKey: 'navigation.shortcutCommandPalette',
      },
      {
        keys: ['⌘', 'P'],
        descriptionKey: 'navigation.shortcutSearchHistory',
        requestOnly: true,
      },
      { keys: ['⌘', '⇧', ','], descriptionKey: 'navigation.shortcutSettings' },
    ],
  },
  {
    labelKey: 'navigation.shortcutTabs',
    requestOnly: true,
    rows: [
      { keys: ['⌘', 'T'], descriptionKey: 'navigation.shortcutNewTab' },
      { keys: ['⌘', 'W'], descriptionKey: 'navigation.shortcutCloseTab' },
      {
        keys: ['⌘', '⇧', 'D'],
        descriptionKey: 'navigation.shortcutDuplicateTab',
      },
      { keys: ['⌃', 'Tab'], descriptionKey: 'navigation.shortcutNextTab' },
      {
        keys: ['⌃', '⇧', 'Tab'],
        descriptionKey: 'navigation.shortcutPreviousTab',
      },
    ],
  },
  {
    labelKey: 'navigation.shortcutView',
    rows: [
      {
        keys: ['⌥', 'T'],
        descriptionKey: 'navigation.shortcutToggleTheme',
      },
      {
        keys: ['⌥', 'C'],
        descriptionKey: 'navigation.shortcutCopyResponse',
      },
      { keys: ['?'], descriptionKey: 'navigation.shortcutShowDialog' },
    ],
  },
];

const WIN_SECTIONS: ShortcutSection[] = [
  {
    labelKey: 'navigation.shortcutRequests',
    rows: [
      { keys: ['Ctrl', 'Enter'], descriptionKey: 'navigation.shortcutSend' },
      { keys: ['Esc'], descriptionKey: 'navigation.shortcutCancel' },
      {
        keys: ['Ctrl', 'Shift', 'N'],
        descriptionKey: 'navigation.shortcutNewRequest',
      },
    ],
  },
  {
    labelKey: 'navigation.shortcutComposer',
    rows: [
      {
        keys: ['Ctrl', 'K'],
        descriptionKey: 'navigation.shortcutCommandPalette',
      },
      {
        keys: ['Ctrl', 'P'],
        descriptionKey: 'navigation.shortcutSearchHistory',
        requestOnly: true,
      },
      {
        keys: ['Ctrl', 'Shift', ','],
        descriptionKey: 'navigation.shortcutSettings',
      },
    ],
  },
  {
    labelKey: 'navigation.shortcutTabs',
    requestOnly: true,
    rows: [
      { keys: ['Ctrl', 'T'], descriptionKey: 'navigation.shortcutNewTab' },
      { keys: ['Ctrl', 'W'], descriptionKey: 'navigation.shortcutCloseTab' },
      {
        keys: ['Ctrl', 'Shift', 'D'],
        descriptionKey: 'navigation.shortcutDuplicateTab',
      },
      { keys: ['Ctrl', 'Tab'], descriptionKey: 'navigation.shortcutNextTab' },
      {
        keys: ['Ctrl', 'Shift', 'Tab'],
        descriptionKey: 'navigation.shortcutPreviousTab',
      },
    ],
  },
  {
    labelKey: 'navigation.shortcutView',
    rows: [
      {
        keys: ['Alt', 'T'],
        descriptionKey: 'navigation.shortcutToggleTheme',
      },
      {
        keys: ['Alt', 'C'],
        descriptionKey: 'navigation.shortcutCopyResponse',
      },
      { keys: ['?'], descriptionKey: 'navigation.shortcutShowDialog' },
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
  const { t } = useTranslation();
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  const isEval = useUiStore((s) => s.mainView === 'eval');

  // In eval mode, drop request-only sections/rows (tabs, history search).
  const sections = SECTIONS.filter((section) => !isEval || !section.requestOnly)
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => !isEval || !row.requestOnly),
    }))
    .filter((section) => section.rows.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('navigation.keyboardShortcuts')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.labelKey} className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                {t(section.labelKey)}
              </span>
              <div className="flex flex-col gap-1">
                {section.rows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-foreground text-xs">
                      {t(row.descriptionKey)}
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
