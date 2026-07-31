import { db } from '@/db';
import {
  useTabStore,
  MAX_TABS,
  REQUEST_SESSION_SETTING_KEY,
  computeTabLabel,
  createDefaultComposerSnapshot,
  persistRequestSessionNow,
} from './tab-store';
import { useComposerStore } from './composer-store';
import { useResponseStore } from './response-store';

function resetAll() {
  useComposerStore.getState().resetComposer();
  useResponseStore.getState().resetResponse();
  // Reset tab store to a single blank tab
  const { tabs } = useTabStore.getState();
  useTabStore.setState({
    tabs: [{ ...tabs[0] }],
    activeTabId: tabs[0].id,
  });
}

describe('tab-store', () => {
  beforeEach(() => {
    resetAll();
  });

  describe('computeTabLabel', () => {
    it('returns "New Request" when messages are empty', () => {
      expect(computeTabLabel([{ id: '1', role: 'user', content: '' }])).toBe(
        'New Request',
      );
    });

    it('returns truncated label from first user message', () => {
      const long = 'A'.repeat(30);
      const label = computeTabLabel([{ id: '1', role: 'user', content: long }]);
      expect(label.length).toBeLessThanOrEqual(23); // 22 chars + ellipsis
      expect(label.endsWith('\u2026')).toBe(true);
    });

    it('returns exact content when short enough', () => {
      expect(
        computeTabLabel([{ id: '1', role: 'user', content: 'Hello' }]),
      ).toBe('Hello');
    });
  });

  describe('initial state', () => {
    it('starts with one tab', () => {
      expect(useTabStore.getState().tabs).toHaveLength(1);
    });

    it('has an active tab id matching the first tab', () => {
      const { tabs, activeTabId } = useTabStore.getState();
      expect(activeTabId).toBe(tabs[0].id);
    });
  });

  describe('createTab', () => {
    it('adds a new tab and makes it active', () => {
      useTabStore.getState().createTab();
      const { tabs, activeTabId } = useTabStore.getState();
      expect(tabs).toHaveLength(2);
      expect(activeTabId).toBe(tabs[1].id);
    });

    it('resets composer and response to blank state', () => {
      useComposerStore.setState({
        messages: [{ id: '1', role: 'user', content: 'existing content' }],
      });

      useTabStore.getState().createTab();

      const { messages } = useComposerStore.getState();
      const firstUser = messages.find((m) => m.role === 'user');
      expect(firstUser?.content).toBe('');
    });

    it('respects MAX_TABS limit', () => {
      for (let i = 0; i < MAX_TABS - 1; i++) {
        useTabStore.getState().createTab();
      }
      expect(useTabStore.getState().tabs).toHaveLength(MAX_TABS);

      // One more create should not add a tab
      useTabStore.getState().createTab();
      expect(useTabStore.getState().tabs).toHaveLength(MAX_TABS);
    });
  });

  describe('switchTab', () => {
    it('saves current composer state and loads the target tab state', () => {
      // Set some content in the first tab
      useComposerStore.setState({
        messages: [{ id: '1', role: 'user', content: 'tab 1 content' }],
      });

      // Create a second tab (blank)
      useTabStore.getState().createTab();
      const { tabs, activeTabId } = useTabStore.getState();
      expect(tabs).toHaveLength(2);

      // Switch back to the first tab
      const firstTabId = tabs[0].id;
      useTabStore.getState().switchTab(firstTabId);
      expect(useTabStore.getState().activeTabId).toBe(firstTabId);

      // Composer should be restored to tab 1 content
      const { messages } = useComposerStore.getState();
      const firstUser = messages.find((m) => m.role === 'user');
      expect(firstUser?.content).toBe('tab 1 content');

      void activeTabId; // used above
    });

    it('is a no-op when switching to the already-active tab', () => {
      const { activeTabId } = useTabStore.getState();
      const tabsBefore = useTabStore.getState().tabs;

      useTabStore.getState().switchTab(activeTabId);

      expect(useTabStore.getState().tabs).toBe(tabsBefore);
    });
  });

  describe('closeTab', () => {
    it('cannot close the last remaining tab', () => {
      const { tabs } = useTabStore.getState();
      useTabStore.getState().closeTab(tabs[0].id);
      expect(useTabStore.getState().tabs).toHaveLength(1);
    });

    it('closes an inactive tab without switching', () => {
      useTabStore.getState().createTab();
      const { tabs, activeTabId } = useTabStore.getState();
      const inactiveId = tabs[0].id;

      useTabStore.getState().closeTab(inactiveId);

      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().activeTabId).toBe(activeTabId);
    });

    it('switches to an adjacent tab when closing the active tab', () => {
      useTabStore.getState().createTab();
      const { tabs, activeTabId } = useTabStore.getState();

      useTabStore.getState().closeTab(activeTabId);

      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().activeTabId).toBe(tabs[0].id);
    });
  });

  describe('duplicateActiveTab', () => {
    it('creates a new tab with the same composer content', () => {
      useComposerStore.setState({
        messages: [{ id: '1', role: 'user', content: 'prompt to duplicate' }],
      });

      useTabStore.getState().duplicateActiveTab();

      const { tabs } = useTabStore.getState();
      expect(tabs).toHaveLength(2);

      // The duplicate is now active; check its composer was loaded
      const { messages } = useComposerStore.getState();
      const firstUser = messages.find((m) => m.role === 'user');
      expect(firstUser?.content).toBe('prompt to duplicate');
    });

    it('labels the duplicate with "(copy)" suffix', () => {
      useComposerStore.setState({
        messages: [{ id: '1', role: 'user', content: 'test prompt' }],
      });

      useTabStore.getState().duplicateActiveTab();

      const { tabs } = useTabStore.getState();
      const duplicate = tabs[tabs.length - 1];
      expect(duplicate.label).toContain('(copy)');
    });
  });

  describe('request session persistence', () => {
    beforeEach(async () => {
      await db.settings.delete(REQUEST_SESSION_SETTING_KEY);
      useTabStore.setState({
        hydrated: false,
        draftPersistenceStatus: 'idle',
      });
    });

    afterEach(async () => {
      await persistRequestSessionNow();
      await db.settings.delete(REQUEST_SESSION_SETTING_KEY);
    });

    it('persists the active composer as a local draft', async () => {
      await useTabStore.getState().hydrate();
      useComposerStore.setState({
        messages: [{ id: 'draft-message', role: 'user', content: 'Keep me' }],
      });

      await persistRequestSessionNow();

      const setting = await db.settings.get(REQUEST_SESSION_SETTING_KEY);
      expect(setting?.value).toMatchObject({
        version: 1,
        activeTabId: useTabStore.getState().activeTabId,
        tabs: [
          {
            label: 'Keep me',
            composer: {
              messages: [
                { id: 'draft-message', role: 'user', content: 'Keep me' },
              ],
            },
          },
        ],
      });
      expect(useTabStore.getState().draftPersistenceStatus).toBe('saved');
    });

    it('restores saved tabs and the active composer', async () => {
      const firstComposer = createDefaultComposerSnapshot();
      const secondComposer = {
        ...createDefaultComposerSnapshot(),
        messages: [
          {
            id: 'restored-message',
            role: 'user' as const,
            content: 'Restored',
          },
        ],
      };
      await db.settings.put({
        key: REQUEST_SESSION_SETTING_KEY,
        value: {
          version: 1,
          activeTabId: 'tab-2',
          tabs: [
            { id: 'tab-1', label: 'First', composer: firstComposer },
            { id: 'tab-2', label: 'Restored', composer: secondComposer },
          ],
        },
      });

      await useTabStore.getState().hydrate();

      expect(useTabStore.getState().tabs).toHaveLength(2);
      expect(useTabStore.getState().activeTabId).toBe('tab-2');
      expect(useComposerStore.getState().messages).toEqual(
        secondComposer.messages,
      );
      expect(useResponseStore.getState().response).toBeNull();
    });
  });
});
