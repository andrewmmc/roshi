import { useComposerStore } from '@/stores/composer-store';
import { useTabStore } from '@/stores/tab-store';
import { cn } from '@/lib/utils';

function hasDraftContent(state: ReturnType<typeof useComposerStore.getState>) {
  return (
    state.systemPrompt.trim() !== '' ||
    state.messages.some(
      (message) =>
        message.content.trim() !== '' || (message.attachments?.length ?? 0) > 0,
    ) ||
    state.customHeaders.some(
      (header) => header.key.trim() !== '' || header.value.trim() !== '',
    )
  );
}

export function DraftStatus() {
  const hasDraft = useComposerStore(hasDraftContent);
  const status = useTabStore((state) => state.draftPersistenceStatus);

  if (!hasDraft) return null;

  const label =
    status === 'saving'
      ? 'Saving draft…'
      : status === 'error'
        ? 'Draft not saved'
        : 'Saved locally';

  return (
    <span
      role="status"
      className={cn(
        'hidden items-center gap-1.5 text-xs whitespace-nowrap sm:inline-flex',
        status === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
      title={
        status === 'error'
          ? 'Roshi could not save this local draft.'
          : 'Unsent request drafts are stored on this device.'
      }
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'saving'
            ? 'bg-amber-500'
            : status === 'error'
              ? 'bg-destructive'
              : 'bg-green-600 dark:bg-green-400',
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
