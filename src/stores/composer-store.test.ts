import { useComposerStore } from './composer-store';
import { useResponseStore } from './response-store';
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '@/constants/defaults';

vi.mock('nanoid', () => {
  let count = 0;
  return { nanoid: vi.fn(() => `mock-id-${++count}`) };
});

describe('composer-store', () => {
  const getState = () => useComposerStore.getState();

  beforeEach(() => {
    useComposerStore.setState({
      messages: [{ id: 'msg-1', role: 'user', content: '' }],
      systemPrompt: '',
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      stream: true,
      customHeaders: [{ id: 'hdr-1', key: '', value: '' }],
    });
    useResponseStore.setState({
      sentRequest: null,
    });
  });

  describe('initial state', () => {
    it('has one empty user message', () => {
      expect(getState().messages).toHaveLength(1);
      expect(getState().messages[0].role).toBe('user');
      expect(getState().messages[0].content).toBe('');
    });

    it('has default temperature and maxTokens', () => {
      expect(getState().temperature).toBe(DEFAULT_TEMPERATURE);
      expect(getState().maxTokens).toBe(DEFAULT_MAX_TOKENS);
    });

    it('has stream enabled by default', () => {
      expect(getState().stream).toBe(true);
    });
  });

  describe('message CRUD', () => {
    it('setMessages replaces all messages', () => {
      const msgs = [
        { id: 'a', role: 'user' as const, content: 'Hi' },
        { id: 'b', role: 'assistant' as const, content: 'Hello' },
      ];
      getState().setMessages(msgs);
      expect(getState().messages).toEqual(msgs);
    });

    it('addMessage appends with generated id', () => {
      getState().addMessage({ role: 'user', content: 'New message' });
      expect(getState().messages).toHaveLength(2);
      expect(getState().messages[1].content).toBe('New message');
      expect(getState().messages[1].id).toBeTruthy();
    });

    it('addMessage preserves existing id', () => {
      getState().addMessage({ id: 'custom-id', role: 'user', content: 'Test' });
      expect(getState().messages[1].id).toBe('custom-id');
    });

    it('updateMessage replaces at index', () => {
      getState().updateMessage(0, {
        id: 'msg-1',
        role: 'assistant',
        content: 'Updated',
      });
      expect(getState().messages[0].role).toBe('assistant');
      expect(getState().messages[0].content).toBe('Updated');
    });

    it('removeMessage removes at index', () => {
      getState().addMessage({ role: 'user', content: 'Second' });
      expect(getState().messages).toHaveLength(2);
      getState().removeMessage(0);
      expect(getState().messages).toHaveLength(1);
      expect(getState().messages[0].content).toBe('Second');
    });
  });

  describe('attachments', () => {
    it('addAttachment adds to message', () => {
      const attachment = {
        id: 'att-1',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        data: 'data:...',
      };
      getState().addAttachment(0, attachment);
      expect(getState().messages[0].attachments).toEqual([attachment]);
    });

    it('addAttachment initializes attachments array if undefined', () => {
      getState().setMessages([{ id: 'a', role: 'user', content: 'Hi' }]);
      expect(getState().messages[0].attachments).toBeUndefined();
      getState().addAttachment(0, {
        id: 'att-1',
        filename: 'f',
        mimeType: 't',
        data: 'd',
      });
      expect(getState().messages[0].attachments).toHaveLength(1);
    });

    it('removeAttachment removes by id', () => {
      const att1 = { id: 'att-1', filename: 'a', mimeType: 't', data: 'd' };
      const att2 = { id: 'att-2', filename: 'b', mimeType: 't', data: 'd' };
      getState().addAttachment(0, att1);
      getState().addAttachment(0, att2);
      getState().removeAttachment(0, 'att-1');
      expect(getState().messages[0].attachments).toEqual([att2]);
    });
  });

  describe('setters', () => {
    it('setSystemPrompt', () => {
      getState().setSystemPrompt('Be helpful');
      expect(getState().systemPrompt).toBe('Be helpful');
    });

    it('setTemperature', () => {
      getState().setTemperature(0.5);
      expect(getState().temperature).toBe(0.5);
    });

    it('setMaxTokens', () => {
      getState().setMaxTokens(2048);
      expect(getState().maxTokens).toBe(2048);
    });

    it('setStream', () => {
      getState().setStream(false);
      expect(getState().stream).toBe(false);
    });

    it('setCustomHeaders', () => {
      const headers = [{ id: '1', key: 'X-Test', value: 'val' }];
      getState().setCustomHeaders(headers);
      expect(getState().customHeaders).toEqual(headers);
    });
  });

  describe('resetComposer', () => {
    it('restores all composer fields to defaults', () => {
      getState().setTemperature(0.1);
      getState().setSystemPrompt('test');
      getState().resetComposer();

      expect(getState().temperature).toBe(DEFAULT_TEMPERATURE);
      expect(getState().systemPrompt).toBe('');
      expect(getState().messages).toHaveLength(1);
      expect(getState().messages[0].role).toBe('user');
      expect(getState().messages[0].content).toBe('');
    });
  });

  describe('loadComposerFromHistory', () => {
    it('hydrates composer fields from history data', () => {
      getState().loadComposerFromHistory({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
        temperature: 0.7,
        maxTokens: 2048,
        stream: false,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
        customHeaders: [{ key: 'X-Test', value: 'abc' }],
      });

      expect(getState().messages[0].content).toBe('Hello');
      expect(getState().messages[0].id).toBeTruthy();
      expect(getState().systemPrompt).toBe('Be helpful');
      expect(getState().temperature).toBe(0.7);
      expect(getState().maxTokens).toBe(2048);
      expect(getState().stream).toBe(false);
      expect(getState().customHeaders).toEqual([
        expect.objectContaining({ key: 'X-Test', value: 'abc' }),
      ]);
    });

    it('defaults to empty header row when customHeaders is empty', () => {
      getState().loadComposerFromHistory({
        messages: [{ role: 'user', content: '' }],
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
        stream: true,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        customHeaders: [],
      });

      expect(getState().customHeaders).toEqual([
        expect.objectContaining({ key: '', value: '' }),
      ]);
    });
  });
});
