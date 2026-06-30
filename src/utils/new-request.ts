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
