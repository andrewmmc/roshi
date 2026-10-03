import { describe, expect, it } from 'vitest';
import { makeMessage } from '@/__tests__/fixtures';
import { emptyResult } from '@/types/eval';
import { useComposerStore } from '@/stores/composer-store';
import { useEvalStore } from '@/stores/eval-store';
import { useResponseStore } from '@/stores/response-store';
import { useTabStore } from '@/stores/tab-store';
import { useToastStore } from '@/stores/toast-store';
import { useUiStore } from '@/stores/ui-store';
import {
  activeWorkspaceHasUnsavedChanges,
  getActiveResponseText,
  getDiscardDialogCopy,
  requestCloseActiveTab,
  resetActiveWorkspace,
} from './new-request';

function resetStores() {
  useComposerStore.setState(useComposerStore.getInitialState(), true);
  useResponseStore.setState(useResponseStore.getInitialState(), true);
  useTabStore.setState(useTabStore.getInitialState(), true);
  useEvalStore.getState().reset();
  useUiStore.setState({
    ...useUiStore.getInitialState(),
    mainView: 'request',
    pendingTabCloseId: null,
  });
  useToastStore.setState({ toasts: [] });
}

describe('new-request helpers', () => {
  beforeEach(() => {
    resetStores();
  });

  describe('resetActiveWorkspace', () => {
    it('resets composer and response in request mode', () => {
      useComposerStore
        .getState()
        .setMessages([makeMessage({ content: 'draft' })]);
      useResponseStore.setState({ streamingContent: 'partial' });

      resetActiveWorkspace();

      expect(useComposerStore.getState().messages[0]?.content).toBe('');
      expect(useResponseStore.getState().streamingContent).toBe('');
    });

    it('resets eval state in eval mode', () => {
      useUiStore.getState().setMainView('eval');
      useEvalStore.setState({
        composer: {
          ...useEvalStore.getState().composer,
          systemPrompt: 'Judge this',
        },
      });

      resetActiveWorkspace();

      expect(useEvalStore.getState().composer.systemPrompt).toBe('');
    });
  });

  describe('activeWorkspaceHasUnsavedChanges', () => {
    it('detects request composer drafts and eval drafts', () => {
      expect(activeWorkspaceHasUnsavedChanges()).toBe(false);
      useComposerStore
        .getState()
        .setMessages([makeMessage({ content: 'hello' })]);
      expect(activeWorkspaceHasUnsavedChanges()).toBe(true);

      resetStores();
      useUiStore.getState().setMainView('eval');
      expect(activeWorkspaceHasUnsavedChanges()).toBe(false);
      useEvalStore.getState().updateMessage(0, { content: 'eval draft' });
      expect(activeWorkspaceHasUnsavedChanges()).toBe(true);
    });
  });

  describe('requestCloseActiveTab', () => {
    it('toasts when only one tab remains', () => {
      requestCloseActiveTab();
      expect(useToastStore.getState().toasts[0]?.message).toBe(
        'At least one request tab stays open',
      );
      expect(useTabStore.getState().tabs).toHaveLength(1);
    });

    it('toasts when a request is still running', () => {
      useTabStore.getState().createTab();
      useResponseStore.setState({ isLoading: true });

      requestCloseActiveTab();

      expect(useToastStore.getState().toasts[0]?.message).toBe(
        'Stop the running request first',
      );
      expect(useTabStore.getState().tabs).toHaveLength(2);
    });

    it('asks for confirmation when the active tab has stored work', () => {
      useTabStore.getState().createTab();
      useComposerStore.setState({
        messages: [makeMessage({ content: 'keep me' })],
      });

      requestCloseActiveTab();

      expect(useUiStore.getState().pendingTabCloseId).toBe(
        useTabStore.getState().activeTabId,
      );
      expect(useTabStore.getState().tabs).toHaveLength(2);
    });

    it('closes a blank extra tab immediately', () => {
      useTabStore.getState().createTab();
      const extraTabId = useTabStore.getState().activeTabId;

      requestCloseActiveTab();

      expect(useTabStore.getState().tabs.map((tab) => tab.id)).not.toContain(
        extraTabId,
      );
      expect(useUiStore.getState().pendingTabCloseId).toBeNull();
    });
  });

  describe('getActiveResponseText', () => {
    it('returns the request response or streaming buffer', () => {
      expect(getActiveResponseText()).toBe('');
      useResponseStore.setState({ streamingContent: 'partial' });
      expect(getActiveResponseText()).toBe('partial');
      useResponseStore.setState({
        response: {
          id: 'resp-1',
          model: 'gpt-4o',
          content: 'final',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        streamingContent: 'partial',
      });
      expect(getActiveResponseText()).toBe('final');
    });

    it('joins eval runner results with headings when several succeeded', () => {
      useUiStore.getState().setMainView('eval');
      useEvalStore.setState({
        runners: [
          {
            id: 'r1',
            providerId: 'p1',
            providerName: 'OpenAI',
            modelId: 'gpt',
            label: 'OpenAI / gpt',
          },
          {
            id: 'r2',
            providerId: 'p2',
            providerName: 'Anthropic',
            modelId: 'claude',
            label: 'Anthropic / claude',
          },
        ],
        results: {
          r1: { ...emptyResult('r1'), status: 'success', content: 'one' },
          r2: { ...emptyResult('r2'), status: 'success', content: 'two' },
        },
      });

      expect(getActiveResponseText()).toBe(
        '## OpenAI / gpt\n\none\n\n## Anthropic / claude\n\ntwo',
      );
    });

    it('returns a single eval runner result without a heading', () => {
      useUiStore.getState().setMainView('eval');
      useEvalStore.setState({
        runners: [
          {
            id: 'r1',
            providerId: 'p1',
            providerName: 'OpenAI',
            modelId: 'gpt',
            label: 'OpenAI / gpt',
          },
        ],
        results: {
          r1: { ...emptyResult('r1'), status: 'success', content: 'only' },
        },
      });

      expect(getActiveResponseText()).toBe('only');
    });
  });

  describe('getDiscardDialogCopy', () => {
    it('uses eval copy in eval mode and request copy otherwise', () => {
      expect(getDiscardDialogCopy('eval')).toEqual({
        titleKey: 'navigation.discardEvalQuestion',
        descriptionKey: 'navigation.discardEvalDescription',
      });
      expect(getDiscardDialogCopy('request')).toEqual({
        titleKey: 'common.discardUnsentChanges',
        descriptionKey: 'common.discardUnsentChangesDescription',
      });
    });
  });
});
