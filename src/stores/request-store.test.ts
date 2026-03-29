import { useRequestStore } from './request-store';
import { DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '@/constants/defaults';

vi.mock('nanoid', () => {
  let count = 0;
  return { nanoid: vi.fn(() => `mock-id-${++count}`) };
});

describe('request-store', () => {
  const getState = () => useRequestStore.getState();

  beforeEach(() => {
    // Reset store data fields (not actions — setState with replace:true would strip them)
    useRequestStore.setState({
      messages: [{ id: 'msg-1', role: 'user', content: '' }],
      systemPrompt: '',
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      stream: true,
      customHeaders: [{ id: 'hdr-1', key: '', value: '' }],
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: null,
      rawRequest: null,
      rawResponse: null,
      error: null,
      errorDetail: null,
      durationMs: null,
      statusCode: null,
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

    it('has null response state', () => {
      expect(getState().isLoading).toBe(false);
      expect(getState().response).toBeNull();
      expect(getState().error).toBeNull();
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

    it('setLoading', () => {
      getState().setLoading(true);
      expect(getState().isLoading).toBe(true);
    });

    it('setStreaming', () => {
      getState().setStreaming(true);
      expect(getState().isStreaming).toBe(true);
    });

    it('setStreamContent', () => {
      getState().setStreamContent('partial');
      expect(getState().streamingContent).toBe('partial');
    });

    it('appendStreamContent concatenates', () => {
      getState().setStreamContent('Hello');
      getState().appendStreamContent(' World');
      expect(getState().streamingContent).toBe('Hello World');
    });

    it('setResponse', () => {
      const resp = {
        id: '1',
        model: 'gpt-4',
        content: 'Hi',
        role: 'assistant' as const,
        finishReason: 'stop',
        usage: null,
      };
      getState().setResponse(resp);
      expect(getState().response).toEqual(resp);
    });

    it('setError', () => {
      getState().setError('Something failed');
      expect(getState().error).toBe('Something failed');
    });

    it('setErrorDetail', () => {
      getState().setErrorDetail('Technical detail');
      expect(getState().errorDetail).toBe('Technical detail');
    });

    it('setDurationMs', () => {
      getState().setDurationMs(150);
      expect(getState().durationMs).toBe(150);
    });

    it('setStatusCode', () => {
      getState().setStatusCode(200);
      expect(getState().statusCode).toBe(200);
    });

    it('setSentRequest', () => {
      const req = {
        messages: [],
        model: 'gpt-4',
        stream: false,
        temperature: 1,
        maxTokens: 4096,
      };
      getState().setSentRequest(req);
      expect(getState().sentRequest).toEqual(req);
    });

    it('setRawRequest', () => {
      getState().setRawRequest({ model: 'test' });
      expect(getState().rawRequest).toEqual({ model: 'test' });
    });

    it('setRawResponse', () => {
      getState().setRawResponse({ id: 'test' });
      expect(getState().rawResponse).toEqual({ id: 'test' });
    });
  });

  describe('reset', () => {
    it('restores all fields to defaults', () => {
      getState().setError('err');
      getState().setErrorDetail('detail');
      getState().setLoading(true);
      getState().setTemperature(0.1);
      getState().reset();

      expect(getState().error).toBeNull();
      expect(getState().errorDetail).toBeNull();
      expect(getState().isLoading).toBe(false);
      expect(getState().temperature).toBe(DEFAULT_TEMPERATURE);
      expect(getState().messages).toHaveLength(1);
      expect(getState().messages[0].role).toBe('user');
      expect(getState().messages[0].content).toBe('');
    });
  });

  describe('loadFromHistory', () => {
    it('hydrates all fields from history data', () => {
      getState().loadFromHistory({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
        temperature: 0.7,
        maxTokens: 2048,
        stream: false,
        customHeaders: [{ key: 'X-Test', value: 'abc' }],
        response: {
          id: '1',
          model: 'gpt-4',
          content: 'Hi',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: { model: 'gpt-4' },
        rawResponse: { id: '1' },
        error: null,
        durationMs: 150,
        statusCode: 200,
      });

      expect(getState().messages[0].content).toBe('Hello');
      expect(getState().messages[0].id).toBeTruthy(); // ID generated
      expect(getState().systemPrompt).toBe('Be helpful');
      expect(getState().temperature).toBe(0.7);
      expect(getState().maxTokens).toBe(2048);
      expect(getState().stream).toBe(false);
      expect(getState().customHeaders).toEqual([
        expect.objectContaining({ key: 'X-Test', value: 'abc' }),
      ]);
      expect(getState().response?.content).toBe('Hi');
      expect(getState().isLoading).toBe(false);
      expect(getState().isStreaming).toBe(false);
      expect(getState().durationMs).toBe(150);
      expect(getState().statusCode).toBe(200);
    });

    it('sets statusCode to null when undefined', () => {
      getState().loadFromHistory({
        messages: [{ role: 'user', content: '' }],
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
        stream: true,
        customHeaders: [],
        response: null,
        rawRequest: null,
        rawResponse: null,
        error: null,
        durationMs: null,
        statusCode: undefined as unknown as number | null,
      });

      expect(getState().statusCode).toBeNull();
      expect(getState().customHeaders).toEqual([
        expect.objectContaining({ key: '', value: '' }),
      ]);
    });

    it('constructs sentRequest with empty model', () => {
      getState().loadFromHistory({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'sys',
        temperature: 0.5,
        maxTokens: 1024,
        stream: true,
        customHeaders: [],
        response: null,
        rawRequest: null,
        rawResponse: null,
        error: null,
        durationMs: null,
        statusCode: null,
      });

      expect(getState().sentRequest?.model).toBe('');
      expect(getState().sentRequest?.temperature).toBe(0.5);
    });
  });
});
