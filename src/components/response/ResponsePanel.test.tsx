import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NormalizedRequest, NormalizedResponse } from '@/types/normalized';
import { ResponsePanel } from './ResponsePanel';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { makeProvider } from '@/__tests__/fixtures';

const {
  exportCurrentRequest,
  resetTrackedViews,
  nextTrackedViewInstanceId,
  trackedViews,
} = vi.hoisted(() => {
  const createStats = () => ({
    mounts: 0,
    unmounts: 0,
    renders: 0,
    instanceIds: [] as number[],
  });
  const trackedViews = {
    chat: createStats(),
    raw: createStats(),
    headers: createStats(),
    code: createStats(),
  };
  let nextInstanceId = 0;

  return {
    exportCurrentRequest: vi.fn(),
    trackedViews,
    nextTrackedViewInstanceId: () => {
      nextInstanceId += 1;
      return nextInstanceId;
    },
    resetTrackedViews: () => {
      nextInstanceId = 0;
      Object.values(trackedViews).forEach((stats) => {
        stats.mounts = 0;
        stats.unmounts = 0;
        stats.renders = 0;
        stats.instanceIds = [];
      });
    },
  };
});

vi.mock('@/utils/export', () => ({
  exportCurrentRequest,
}));

vi.mock('./ChatView', async () => {
  const { useEffect, useRef } = await import('react');

  return {
    ChatView: () => {
      const instanceId = useRef(nextTrackedViewInstanceId());
      trackedViews.chat.renders += 1;

      useEffect(() => {
        trackedViews.chat.mounts += 1;
        trackedViews.chat.instanceIds.push(instanceId.current);
        return () => {
          trackedViews.chat.unmounts += 1;
        };
      }, []);

      return <div data-testid="chat-view">ChatView Mock</div>;
    },
  };
});

vi.mock('./RawJsonView', async () => {
  const { useEffect, useRef } = await import('react');

  return {
    RawJsonView: () => {
      const instanceId = useRef(nextTrackedViewInstanceId());
      trackedViews.raw.renders += 1;

      useEffect(() => {
        trackedViews.raw.mounts += 1;
        trackedViews.raw.instanceIds.push(instanceId.current);
        return () => {
          trackedViews.raw.unmounts += 1;
        };
      }, []);

      return <div data-testid="raw-view">RawJsonView Mock</div>;
    },
  };
});

vi.mock('./HeadersView', async () => {
  const { useEffect, useRef } = await import('react');

  return {
    HeadersView: () => {
      const instanceId = useRef(nextTrackedViewInstanceId());
      trackedViews.headers.renders += 1;

      useEffect(() => {
        trackedViews.headers.mounts += 1;
        trackedViews.headers.instanceIds.push(instanceId.current);
        return () => {
          trackedViews.headers.unmounts += 1;
        };
      }, []);

      return <div data-testid="headers-view">HeadersView Mock</div>;
    },
  };
});

vi.mock('./CodeView', async () => {
  const { useEffect, useRef } = await import('react');

  return {
    CodeView: () => {
      const instanceId = useRef(nextTrackedViewInstanceId());
      trackedViews.code.renders += 1;

      useEffect(() => {
        trackedViews.code.mounts += 1;
        trackedViews.code.instanceIds.push(instanceId.current);
        return () => {
          trackedViews.code.unmounts += 1;
        };
      }, []);

      return <div data-testid="code-view">CodeView Mock</div>;
    },
  };
});

function createSentRequest(content: string): NormalizedRequest {
  return {
    messages: [{ id: `message-${content}`, role: 'user', content }],
    model: 'gpt-4',
    stream: true,
  };
}

function createResponse(content: string): NormalizedResponse {
  return {
    id: 'resp_1',
    model: 'gpt-4',
    content,
    role: 'assistant',
    finishReason: 'stop',
    usage: null,
  };
}

function seedCompletedResponse(content = 'Hello') {
  const sentRequest = createSentRequest(content);
  useResponseStore.setState({
    sentRequest,
    response: createResponse(content),
    error: null,
    isLoading: false,
    isStreaming: false,
  });
  return sentRequest;
}

async function renderResponsePanel() {
  render(<ResponsePanel />);
  await act(async () => {});
}

describe('ResponsePanel', () => {
  beforeEach(() => {
    useResponseStore.getState().resetResponse();
    exportCurrentRequest.mockReset();
    resetTrackedViews();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: true,
      seeding: false,
    });
  });

  it('shows empty states when there is no response content', async () => {
    const user = userEvent.setup();
    await renderResponsePanel();

    expect(
      screen.getAllByText('Add a provider API key to send your first request.'),
    ).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /add api key/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /pick a model/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Write a message above, then press Send.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('tablist', { name: 'Response views' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Body' }));
    await waitFor(() => {
      expect(
        screen.getAllByText(
          'Add a provider API key to send your first request.',
        ),
      ).toHaveLength(2);
    });

    await user.click(screen.getByRole('tab', { name: 'Headers' }));
    await waitFor(() => {
      expect(
        screen.getAllByText(
          'Add a provider API key to send your first request.',
        ),
      ).toHaveLength(3);
    });
  });

  it('guides users to pick a model when the selected provider has none', async () => {
    useProviderStore.setState({
      providers: [makeProvider({ id: 'p1', name: 'Acme', models: [] })],
      selectedProviderId: 'p1',
    });

    await renderResponsePanel();

    expect(
      screen.getByText('Pick a model for Acme before sending.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /pick a model/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add api key/i }),
    ).not.toBeInTheDocument();
  });

  it('shows loading status text while sending', async () => {
    useResponseStore.setState({ isLoading: true });

    await renderResponsePanel();

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sending request...');
  });

  it('renders response metadata and lazily mounts panel aria relationships', async () => {
    const user = userEvent.setup();
    useProviderStore.setState({
      providers: [makeProvider({ id: 'p1', type: 'anthropic' })],
      selectedProviderId: 'p1',
    });
    seedCompletedResponse();
    useResponseStore.setState({
      response: {
        ...createResponse('Hello'),
        model: 'claude',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
      statusCode: 200,
      durationMs: 321,
    });

    await renderResponsePanel();

    expect(await screen.findByTestId('chat-view')).toBeInTheDocument();
    expect(screen.getByText('15 tokens')).toBeInTheDocument();
    expect(screen.getByText('200 Success')).toBeInTheDocument();
    expect(screen.getByText('321ms')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Code' })).toBeEnabled();

    const bodyTab = screen.getByRole('tab', { name: 'Body' });
    expect(bodyTab).not.toHaveAttribute('aria-controls');

    await user.click(bodyTab);
    await waitFor(() => {
      expect(bodyTab).toHaveAttribute('aria-controls');
    });
    expect(await screen.findByTestId('raw-view')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Headers' }));
    expect(await screen.findByTestId('headers-view')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Code' }));
    expect(await screen.findByTestId('code-view')).toBeInTheDocument();
  });

  it('retains visited settled views without eagerly mounting unvisited panels', async () => {
    const user = userEvent.setup();
    seedCompletedResponse();

    await renderResponsePanel();

    const chatView = await screen.findByTestId('chat-view');
    expect(trackedViews.chat.mounts).toBe(1);
    expect(trackedViews.raw.mounts).toBe(0);
    expect(trackedViews.headers.mounts).toBe(0);
    expect(trackedViews.code.mounts).toBe(0);

    await user.click(screen.getByRole('tab', { name: 'Body' }));
    const rawView = await screen.findByTestId('raw-view');

    expect(trackedViews.chat.mounts).toBe(1);
    expect(trackedViews.chat.unmounts).toBe(0);
    expect(trackedViews.raw.mounts).toBe(1);

    await user.click(screen.getByRole('tab', { name: 'Chat' }));

    expect(screen.getByTestId('chat-view')).toBe(chatView);
    expect(screen.getByTestId('raw-view')).toBe(rawView);
    expect(trackedViews.chat.mounts).toBe(1);
    expect(trackedViews.chat.unmounts).toBe(0);
    expect(trackedViews.raw.mounts).toBe(1);
    expect(trackedViews.raw.unmounts).toBe(0);
  });

  it('synchronously unmounts hidden retained views when the snapshot changes', async () => {
    const user = userEvent.setup();
    seedCompletedResponse('First response');

    await renderResponsePanel();

    await screen.findByTestId('chat-view');
    await user.click(screen.getByRole('tab', { name: 'Body' }));
    await screen.findByTestId('raw-view');

    act(() => {
      useResponseStore.setState({
        sentRequest: createSentRequest('Loaded history'),
        response: createResponse('Loaded history'),
        error: null,
        isLoading: false,
        isStreaming: false,
      });
    });

    expect(screen.queryByTestId('chat-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('raw-view')).toBeInTheDocument();
    expect(trackedViews.chat.unmounts).toBe(1);
    expect(trackedViews.raw.unmounts).toBe(0);
  });

  it('does not keep a hidden chat view mounted while streaming', async () => {
    const user = userEvent.setup();
    seedCompletedResponse('First response');

    await renderResponsePanel();

    await screen.findByTestId('chat-view');
    await user.click(screen.getByRole('tab', { name: 'Body' }));
    await screen.findByTestId('raw-view');

    act(() => {
      useResponseStore.getState().startRequest(createSentRequest('Streaming'));
    });

    expect(screen.queryByTestId('chat-view')).not.toBeInTheDocument();
    expect(trackedViews.chat.unmounts).toBe(1);

    const chatRendersBeforeStreaming = trackedViews.chat.renders;

    act(() => {
      useResponseStore.getState().setStreamChunk('chunk 1');
      useResponseStore.getState().setStreamChunk('chunk 2');
    });

    expect(screen.queryByTestId('chat-view')).not.toBeInTheDocument();
    expect(trackedViews.chat.renders).toBe(chatRendersBeforeStreaming);
  });

  it('shows streaming status text', async () => {
    useResponseStore.setState({ isLoading: true, isStreaming: true });

    await renderResponsePanel();

    expect(screen.getByText('Streaming...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Streaming response...',
    );
  });

  it('renders error metadata and exports the current request', async () => {
    const user = userEvent.setup();
    useResponseStore.setState({
      error: 'Bad request',
      statusCode: 400,
      durationMs: 20,
      rawRequest: { model: 'gpt-4' },
      rawResponse: { error: 'bad' },
    });

    await renderResponsePanel();

    expect(screen.getByRole('status')).toHaveTextContent('Error: Bad request');
    expect(screen.getByText('400 Error')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /export request and response as json/i,
      }),
    );

    expect(exportCurrentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Bad request', statusCode: 400 }),
    );
  });

  it('shows interrupted status for partial streamed responses', async () => {
    useResponseStore.setState({
      response: {
        ...createResponse('Partial answer'),
        finishReason: null,
      },
      error: 'Response interrupted',
      statusCode: 200,
      durationMs: 180,
    });

    await renderResponsePanel();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Response interrupted',
    );
    expect(screen.getByText('200 Interrupted')).toBeInTheDocument();
  });

  it('keeps the code tab reachable so it can explain missing setup', async () => {
    const user = userEvent.setup();
    await renderResponsePanel();

    const codeTab = screen.getByRole('tab', { name: 'Code' });
    expect(codeTab).toBeEnabled();

    await user.click(codeTab);
    expect(await screen.findByTestId('code-view')).toBeInTheDocument();
  });
});
