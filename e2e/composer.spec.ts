import { expect, test } from '@playwright/test';
import {
  MOCK_ASSISTANT_REPLY,
  mockExternalApis,
  type CapturedLlmRequest,
} from './fixtures/mock-llm';
import {
  clickSend,
  expectAssistantReply,
  fillUserMessage,
  openReadyWorkspace,
} from './fixtures/workspace';

async function lastCaptured(
  captured: CapturedLlmRequest[],
): Promise<CapturedLlmRequest> {
  await expect.poll(() => captured.length).toBeGreaterThan(0);
  return captured[captured.length - 1];
}

test.describe('Composer request flows', () => {
  test('sends a basic prompt and shows the mocked assistant reply', async ({
    page,
  }) => {
    const captured = await mockExternalApis(page);
    await openReadyWorkspace(page);

    await fillUserMessage(page, 'Say hello in one short sentence.');
    await clickSend(page);

    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);

    const request = await lastCaptured(captured);
    expect(request.targetUrl).toContain('/chat/completions');
    expect(request.body?.model).toBe('gpt-4o-mini');
    expect(request.body?.messages).toEqual([
      { role: 'user', content: 'Say hello in one short sentence.' },
    ]);
  });

  test('includes an edited system prompt in the outbound request', async ({
    page,
  }) => {
    const captured = await mockExternalApis(page);
    await openReadyWorkspace(page);

    await page.getByRole('tab', { name: 'System Prompt' }).click();
    await page
      .getByLabel('System prompt')
      .fill('You are a concise test assistant.');

    await page.getByRole('tab', { name: 'Messages' }).click();
    await fillUserMessage(page, 'What is 2 + 2?');
    await clickSend(page);

    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);
    await expect(page.getByLabel('System')).toContainText(
      'You are a concise test assistant.',
    );

    const request = await lastCaptured(captured);
    expect(request.body?.messages).toEqual([
      { role: 'system', content: 'You are a concise test assistant.' },
      { role: 'user', content: 'What is 2 + 2?' },
    ]);
  });

  test('sends multiple messages after adding another turn', async ({
    page,
  }) => {
    const captured = await mockExternalApis(page);
    await openReadyWorkspace(page);

    await fillUserMessage(page, 'First user turn');
    await page.getByRole('button', { name: 'Add message' }).click();

    await page.getByLabel('Role for message 2').click();
    await page.getByRole('option', { name: 'Assistant' }).click();
    await page.getByLabel('assistant message 2').fill('Prior assistant turn');

    await page.getByRole('button', { name: 'Add message' }).click();
    await fillUserMessage(page, 'Follow-up user turn', 3);

    await clickSend(page);
    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);

    const request = await lastCaptured(captured);
    expect(request.body?.messages).toEqual([
      { role: 'user', content: 'First user turn' },
      { role: 'assistant', content: 'Prior assistant turn' },
      { role: 'user', content: 'Follow-up user turn' },
    ]);
  });

  test('applies custom headers and parameter changes to the request', async ({
    page,
  }) => {
    const captured = await mockExternalApis(page);
    await openReadyWorkspace(page);

    await page.getByRole('tab', { name: 'Headers' }).click();
    await page.getByLabel('Custom header name').fill('X-E2E-Test');
    await page.getByLabel('Custom header value').fill('playwright');

    await page.getByRole('tab', { name: 'Parameters' }).click();
    await page.locator('#param-temperature').fill('0.25');
    await page.locator('#param-max-tokens').fill('256');
    await page.locator('#param-stream').uncheck();

    await page.getByRole('tab', { name: 'Messages' }).click();
    await fillUserMessage(page, 'Request with custom header and params');
    await clickSend(page);

    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);

    const request = await lastCaptured(captured);
    expect(request.headers['x-e2e-test']).toBe('playwright');
    expect(request.body?.temperature).toBe(0.25);
    expect(request.body?.max_tokens).toBe(256);
    expect(request.body?.stream).toBe(false);
  });
});
