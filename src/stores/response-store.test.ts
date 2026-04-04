import { useResponseStore } from './response-store';

describe('response-store', () => {
  const getState = () => useResponseStore.getState();

  beforeEach(() => {
    useResponseStore.setState({
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: null,
      rawRequest: null,
      rawResponse: null,
      requestHeaders: null,
      responseHeaders: null,
      error: null,
      errorDetail: null,
      durationMs: null,
      statusCode: null,
      sentRequest: null,
    });
  });

  describe('initial state', () => {
    it('has null response state', () => {
      expect(getState().isLoading).toBe(false);
      expect(getState().response).toBeNull();
      expect(getState().error).toBeNull();
    });
  });

  describe('setters', () => {
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

  describe('resetResponse', () => {
    it('restores all response fields to defaults', () => {
      getState().setError('err');
      getState().setErrorDetail('detail');
      getState().setLoading(true);
      getState().resetResponse();

      expect(getState().error).toBeNull();
      expect(getState().errorDetail).toBeNull();
      expect(getState().isLoading).toBe(false);
    });
  });

  describe('loadResponseFromHistory', () => {
    it('hydrates response fields from history data', () => {
      getState().loadResponseFromHistory({
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
        systemPrompt: 'sys',
        temperature: 0.5,
        maxTokens: 1024,
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
        requestUrl: 'https://api.test.com/v1/chat/completions',
        requestHeaders: { Authorization: 'Bearer test' },
        responseHeaders: { 'content-type': 'application/json' },
        error: null,
        durationMs: 150,
        statusCode: 200,
      });

      expect(getState().response?.content).toBe('Hi');
      expect(getState().isLoading).toBe(false);
      expect(getState().isStreaming).toBe(false);
      expect(getState().durationMs).toBe(150);
      expect(getState().statusCode).toBe(200);
      expect(getState().sentRequest?.model).toBe('');
      expect(getState().sentRequest?.temperature).toBe(0.5);
    });

    it('sets statusCode to null when undefined', () => {
      getState().loadResponseFromHistory({
        messages: [{ role: 'user', content: '' }],
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
        response: null,
        rawRequest: null,
        rawResponse: null,
        requestUrl: null,
        requestHeaders: null,
        responseHeaders: null,
        error: null,
        durationMs: null,
        statusCode: undefined as unknown as number | null,
      });

      expect(getState().statusCode).toBeNull();
    });
  });
});
