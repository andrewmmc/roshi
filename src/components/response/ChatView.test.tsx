import { render, screen } from '@testing-library/react';
import { ChatView } from './ChatView';
import { useResponseStore } from '@/stores/response-store';

describe('ChatView', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    Element.prototype.scrollIntoView = vi.fn();
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

  it('shows loading and streaming states', () => {
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
      streamingContent: 'Partial answer',
    });

    const { container } = render(<ChatView />);

    expect(screen.getByText('Partial answer')).toBeInTheDocument();
    expect(screen.getByLabelText('Response is streaming')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeNull();
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
