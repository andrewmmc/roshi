import {
  selectHasUnsavedChanges,
  useComposerStore,
} from '@/stores/composer-store';
import { selectHasUnsavedEvalChanges, useEvalStore } from '@/stores/eval-store';
import { useResponseStore } from '@/stores/response-store';
import { type MainView, useUiStore } from '@/stores/ui-store';

export function resetActiveWorkspace(): void {
  if (useUiStore.getState().mainView === 'eval') {
    useEvalStore.getState().reset();
    return;
  }

  useComposerStore.getState().resetComposer();
  useResponseStore.getState().resetResponse();
}

export function activeWorkspaceHasUnsavedChanges(): boolean {
  if (useUiStore.getState().mainView === 'eval') {
    return selectHasUnsavedEvalChanges(useEvalStore.getState());
  }

  return selectHasUnsavedChanges(useComposerStore.getState());
}

/**
 * Returns the response text for the active workspace, so shortcuts like
 * "Copy response" work in both request and eval mode.
 *
 * - Request mode: the current response (or in-flight streaming buffer).
 * - Eval mode: the runner result(s). A single populated runner returns its
 *   raw content; multiple runners are concatenated with `## {label}` headings.
 */
export function getActiveResponseText(): string {
  if (useUiStore.getState().mainView === 'eval') {
    const { runners, results } = useEvalStore.getState();
    const parts = runners
      .map((runner) => ({
        label: runner.label,
        content: results[runner.id]?.content?.trim() ?? '',
      }))
      .filter((part) => part.content !== '');

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].content;
    return parts
      .map((part) => `## ${part.label}\n\n${part.content}`)
      .join('\n\n');
  }

  const { response, streamingContent } = useResponseStore.getState();
  return response?.content || streamingContent;
}

export function getDiscardDialogCopy(mainView: MainView): {
  title: string;
  description: string;
} {
  if (mainView === 'eval') {
    return {
      title: 'Discard current eval?',
      description:
        'You have changes in the eval workspace. This action will clear the prompt, runners, and results.',
    };
  }

  return {
    title: 'Discard unsent changes?',
    description:
      'You have unsent content in the composer. This action will replace it and your changes will be lost.',
  };
}
