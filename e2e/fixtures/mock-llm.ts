import type { Page, Request, Route } from '@playwright/test';

export const MOCK_ASSISTANT_REPLY = 'Hello from mock assistant';

export type CapturedLlmRequest = {
  targetUrl: string;
  body: Record<string, unknown> | null;
  headers: Record<string, string>;
};

function buildSseBody(content: string, model: string): string {
  const chunks = [
    {
      id: 'chatcmpl-e2e',
      object: 'chat.completion.chunk',
      created: 1,
      model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content },
          finish_reason: null,
        },
      ],
    },
    {
      id: 'chatcmpl-e2e',
      object: 'chat.completion.chunk',
      created: 1,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 6,
        total_tokens: 18,
      },
    },
  ];

  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') +
    'data: [DONE]\n\n'
  );
}

function buildJsonBody(content: string, model: string): string {
  return JSON.stringify({
    id: 'chatcmpl-e2e',
    object: 'chat.completion',
    created: 1,
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 6,
      total_tokens: 18,
    },
  });
}

function parseBody(request: Request): Record<string, unknown> | null {
  try {
    return request.postDataJSON() as Record<string, unknown>;
  } catch {
    const raw = request.postData();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function isChatCompletionsTarget(targetUrl: string): boolean {
  return /\/chat\/completions(?:\?|$)/.test(targetUrl);
}

function isModelsDevTarget(targetUrl: string): boolean {
  return targetUrl.includes('models.dev');
}

async function fulfillChatCompletion(
  route: Route,
  body: Record<string, unknown> | null,
): Promise<void> {
  const model =
    typeof body?.model === 'string' && body.model.trim()
      ? body.model
      : 'gpt-4o-mini';
  const stream = Boolean(body?.stream);

  if (stream) {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
      },
      body: buildSseBody(MOCK_ASSISTANT_REPLY, model),
    });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: buildJsonBody(MOCK_ASSISTANT_REPLY, model),
  });
}

/**
 * Intercepts Vite's `/api/proxy` and direct provider/catalog URLs so e2e tests
 * never hit real LLM or models.dev endpoints.
 */
export async function mockExternalApis(
  page: Page,
  captured: CapturedLlmRequest[] = [],
): Promise<CapturedLlmRequest[]> {
  const handleProxy = async (route: Route) => {
    const request = route.request();
    const proxyUrl = new URL(request.url());
    const targetUrl = proxyUrl.searchParams.get('url') ?? '';

    if (isChatCompletionsTarget(targetUrl)) {
      const body = parseBody(request);
      captured.push({
        targetUrl,
        body,
        headers: request.headers(),
      });
      await fulfillChatCompletion(route, body);
      return;
    }

    if (isModelsDevTarget(targetUrl)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  };

  await page.route('**/api/proxy**', handleProxy);

  await page.route('https://api.openai.com/**', async (route) => {
    const request = route.request();
    const targetUrl = request.url();
    if (!isChatCompletionsTarget(targetUrl)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
      return;
    }

    const body = parseBody(request);
    captured.push({
      targetUrl,
      body,
      headers: request.headers(),
    });
    await fulfillChatCompletion(route, body);
  });

  await page.route('https://models.dev/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  return captured;
}
