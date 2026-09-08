import { expect, test } from '@playwright/test';
import {
  MOCK_ASSISTANT_REPLY,
  MOCK_PARTIAL_REPLY,
  mockExternalApis,
  type CapturedLlmRequest,
} from './fixtures/mock-llm';
import {
  clickSend,
  expectAssistantReply,
  fillUserMessage,
  openComposerTab,
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

    await openComposerTab(page, 'System Prompt');
    await page
      .getByRole('textbox', { name: 'System prompt' })
      .fill('You are a concise test assistant.');

    await openComposerTab(page, 'Messages');
    await fillUserMessage(page, 'What is 2 + 2?');
    await clickSend(page);

    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);
    await expect(
      page.getByRole('tabpanel', { name: 'Chat' }).getByLabel('System', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('tabpanel', { name: 'Chat' })
        .getByText('You are a concise test assistant.'),
    ).toBeVisible();

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

    await openComposerTab(page, 'Headers');
    await page.getByLabel('Custom header name').fill('X-E2E-Test');
    await page.getByLabel('Custom header value').fill('playwright');

    await openComposerTab(page, 'Parameters');
    // Optional sampling params are opt-in; enable them before editing/sending.
    await page.getByLabel('Include Temperature').check();
    await page.locator('#param-temperature').fill('0.25');
    await page.getByLabel('Include Max Tokens').check();
    await page.locator('#param-max-tokens').fill('256');
    await page.locator('#param-stream').uncheck();

    await openComposerTab(page, 'Messages');
    await fillUserMessage(page, 'Request with custom header and params');
    await clickSend(page);

    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);

    const request = await lastCaptured(captured);
    expect(request.headers['x-e2e-test']).toBe('playwright');
    expect(request.body?.temperature).toBe(0.25);
    expect(request.body?.max_tokens).toBe(256);
    expect(request.body?.stream).toBe(false);
  });

  test('cancels an in-flight request', async ({ page }) => {
    await mockExternalApis(page, [], 'delayed');
    await openReadyWorkspace(page);

    await fillUserMessage(page, 'Cancel this request');
    await clickSend(page);
    await page.getByRole('button', { name: /^Stop/ }).click();

    await expect(page.getByRole('button', { name: /^Send/ })).toBeVisible();
    await expect(
      page
        .getByRole('tabpanel', { name: 'Chat' })
        .getByText('Request cancelled'),
    ).toBeVisible();
  });

  test('preserves partial output when a stream is interrupted', async ({
    page,
  }) => {
    await mockExternalApis(page, [], 'interrupted');
    await openReadyWorkspace(page);

    await fillUserMessage(page, 'Interrupt this stream');
    await clickSend(page);

    await expect(
      page
        .getByRole('tabpanel', { name: 'Chat' })
        .getByText(MOCK_PARTIAL_REPLY, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Interrupted', { exact: true })).toBeVisible();
  });

  test('restores composer and model selection when switching tabs', async ({
    page,
  }) => {
    await mockExternalApis(page);
    await openReadyWorkspace(page);

    await fillUserMessage(page, 'First tab prompt');
    await page.keyboard.press('Meta+t');

    await expect(
      page.getByRole('tablist', { name: 'Request tabs' }),
    ).toBeVisible();
    await page.getByLabel('Select model').click();
    await page.getByRole('option', { name: 'GPT-4o', exact: true }).click();
    await fillUserMessage(page, 'Second tab prompt');

    await page.getByRole('tab', { name: 'First tab prompt' }).click();
    await expect(page.getByLabel('user message 1')).toHaveValue(
      'First tab prompt',
    );
    await expect(page.getByLabel('Select model')).toContainText('GPT-4o mini');

    await page.getByRole('tab', { name: 'Second tab prompt' }).click();
    await expect(page.getByLabel('user message 1')).toHaveValue(
      'Second tab prompt',
    );
    await expect(page.getByLabel('Select model')).toContainText('GPT-4o');
  });

  test('saves the current eval through the UI', async ({ page }) => {
    await mockExternalApis(page);
    await openReadyWorkspace(page);

    await page.getByRole('button', { name: 'Eval', exact: true }).click();
    await page.getByRole('button', { name: 'Add runner' }).click();
    await page.getByRole('button', { name: 'Save current eval run' }).click();
    await page
      .getByRole('textbox', { name: 'Run name' })
      .fill('Saved E2E eval');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(
      page.getByText('Saved E2E eval', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Eval', exact: true }).click();
    await expect(
      page.getByText('Saved E2E eval', { exact: true }),
    ).toBeVisible();
  });

  test('redacts credentials from downloaded request exports', async ({
    page,
  }) => {
    await mockExternalApis(page);
    await openReadyWorkspace(page);

    await openComposerTab(page, 'Headers');
    await page.getByLabel('Custom header name').fill('X-API-Key');
    await page.getByLabel('Custom header value').fill('export-secret-value');
    await openComposerTab(page, 'Messages');
    await fillUserMessage(page, 'Export this request safely');
    await clickSend(page);
    await expectAssistantReply(page, MOCK_ASSISTANT_REPLY);

    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Export request and response as JSON' })
      .click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const exported = Buffer.concat(chunks).toString('utf8');

    expect(exported).toContain('REDACTED');
    expect(exported).not.toContain('export-secret-value');
    expect(exported).not.toContain('sk-e2e-test-key');
  });
});
