import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChatView } from './ChatView';
import { useResponseStore } from '@/stores/response-store';

let animationFrameQueue: FrameRequestCallback[] = [];

function flushAnimationFrame(time = 0) {
  const callbacks = animationFrameQueue;
  animationFrameQueue = [];
  callbacks.forEach((callback) => callback(time));
}

describe('ChatView', () => {
  beforeAll(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      animationFrameQueue.push(callback);
      return animationFrameQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get() {
        return (
          (this as HTMLElement & { __scrollTop?: number }).__scrollTop ?? 600
        );
      },
      set(value: number) {
        (this as HTMLElement & { __scrollTop?: number }).__scrollTop = value;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(function scrollTo(
        this: HTMLElement & { __scrollTop?: number },
        {
          top,
        }: {
          top: number;
          behavior?: ScrollBehavior;
        },
      ) {
        this.__scrollTop = top;
      }),
    });
    animationFrameQueue = [];
  });

  afterEach(() => {
    flushAnimationFrame();
    vi.clearAllMocks();
  });

  it('renders system prompt, sent messages, and completed assistant response', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [
          { id: 'm1', role: 'user', content: 'Hello' },
          {
            id: 'm2',
            role: 'user',
            content: '',
            attachments: [
              {
                id: 'a1',
                filename: 'image.png',
                mimeType: 'image/png',
                data: 'data:image/png;base64,aaa',
              },
            ],
          },
        ],
        model: 'gpt-4',
        stream: true,
        systemPrompt: 'Behave.',
        temperature: 1,
        maxTokens: 4096,
      },
      response: {
        id: 'resp_1',
        model: 'gpt-4',
        content: 'Hi there',
        role: 'assistant',
        finishReason: 'stop',
        usage: null,
      },
    });

    render(<ChatView />);

    expect(screen.getByText('Behave.')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('shows a loader while waiting for the first response token', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      isLoading: true,
      isStreaming: false,
      streamingContent: '',
    });

    const { container } = render(<ChatView />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('coalesces streaming updates to animation frames and preserves the final text', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      isLoading: true,
      isStreaming: true,
      streamingContent: '',
    });

    render(<ChatView />);

    act(() => {
      useResponseStore.getState().setStreamChunk('Hello');
      useResponseStore.getState().setStreamChunk(' there');
      useResponseStore.getState().setStreamChunk(' friend');
    });

    expect(screen.queryByText('Hello there friend')).not.toBeInTheDocument();

    act(() => {
      flushAnimationFrame();
    });

    expect(screen.getByText('Hello there friend')).toBeInTheDocument();
    expect(screen.getByLabelText('Response is streaming')).toBeInTheDocument();
  });

  it('renders streaming content as plain text and swaps to markdown once on completion', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      isLoading: true,
      isStreaming: true,
      streamingContent: '',
    });

    render(<ChatView />);

    act(() => {
      useResponseStore.getState().setStreamChunk('[Docs](https://example.com)');
      flushAnimationFrame();
    });

    expect(screen.getByText('[Docs](https://example.com)')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Docs' }),
    ).not.toBeInTheDocument();

    act(() => {
      useResponseStore.getState().completeResponse({
        response: {
          id: 'resp_1',
          model: 'gpt-4',
          content: '[Docs](https://example.com)',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: null,
        rawResponse: null,
        requestUrl: 'https://api.example.com',
        requestHeaders: null,
        responseHeaders: null,
        durationMs: 123,
        statusCode: 200,
      });
      useResponseStore.getState().finishRequest();
      flushAnimationFrame();
    });

    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('pauses auto-follow while scrolled away from the bottom and resumes when returned', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      isLoading: true,
      isStreaming: true,
      streamingContent: '',
    });

    const { container } = render(<ChatView />);
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    expect(viewport).not.toBeNull();
    const scrollTo = vi.mocked(viewport!.scrollTo);

    act(() => {
      useResponseStore.getState().setStreamChunk('chunk 1');
      flushAnimationFrame();
      flushAnimationFrame();
    });

    expect(scrollTo).toHaveBeenCalled();
    scrollTo.mockClear();
    animationFrameQueue = [];

    viewport!.scrollTop = 100;
    fireEvent.scroll(viewport!);

    act(() => {
      useResponseStore.getState().setStreamChunk('chunk 2');
      flushAnimationFrame();
      flushAnimationFrame();
    });

    expect(scrollTo).not.toHaveBeenCalled();

    viewport!.scrollTop = 600;
    fireEvent.scroll(viewport!);

    act(() => {
      useResponseStore.getState().setStreamChunk('chunk 3');
      flushAnimationFrame();
      flushAnimationFrame();
      flushAnimationFrame();
    });

    act(() => {
      flushAnimationFrame();
    });

    expect(scrollTo).toHaveBeenCalled();
  });

  it('renders assistant and system messages', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [
          { id: 'assistant-1', role: 'assistant', content: 'Assistant draft' },
          { id: 'system-1', role: 'system', content: 'System context' },
        ],
        model: 'gpt-4',
        stream: false,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
    });

    render(<ChatView />);

    expect(screen.getByText('Assistant draft')).toBeInTheDocument();
    expect(screen.getByText('System context')).toBeInTheDocument();
  });

  it('shows interrupted stream warning with partial content and raw chunks', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      response: {
        id: 'resp_1',
        model: 'gpt-4',
        content: 'Partial answer',
        role: 'assistant',
        finishReason: null,
        usage: null,
      },
      error: 'Response interrupted',
      errorDetail: 'connection reset',
      rawResponse: {
        interrupted: true,
        streamError: 'connection reset',
        chunks: [{ id: 'resp_1' }],
      },
    });

    render(<ChatView />);

    expect(screen.getByText('Partial answer')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Response interrupted');
    expect(screen.getByText('connection reset')).toBeInTheDocument();
    expect(screen.getByText(/"interrupted": true/)).toBeInTheDocument();
  });

  it('shows error details and raw response payload', () => {
    useResponseStore.setState({
      sentRequest: {
        messages: [],
        model: 'gpt-4',
        stream: true,
        systemPrompt: '',
        temperature: 1,
        maxTokens: 4096,
      },
      error: 'Request failed',
      errorDetail: 'timeout',
      rawResponse: { error: { message: 'timeout' } },
    });

    render(<ChatView />);

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed');
    expect(screen.getByText('timeout')).toBeInTheDocument();
    expect(screen.getByText(/"message": "timeout"/)).toBeInTheDocument();
  });
});
