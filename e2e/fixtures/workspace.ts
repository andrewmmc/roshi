import { expect, type Page } from '@playwright/test';

const E2E_API_KEY = 'sk-e2e-test-key';
const E2E_MODEL_ID = 'gpt-4o-mini';

async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByText('Restoring workspace…')).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.getByLabel('Select provider')).toBeVisible({
    timeout: 30_000,
  });
}

async function dismissOnboarding(page: Page): Promise<void> {
  const closeChecklist = page.getByRole('button', { name: 'Close checklist' });
  if (await closeChecklist.isVisible().catch(() => false)) {
    await closeChecklist.click();
  }
}

async function seedOpenAiProvider(page: Page): Promise<void> {
  await page.evaluate(
    async ({ apiKey, modelId }) => {
      function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(request.error ?? new Error('IDB error'));
        });
      }

      function waitForTransaction(tx: IDBTransaction): Promise<void> {
        return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () =>
            reject(tx.error ?? new Error('IDB transaction failed'));
          tx.onabort = () =>
            reject(tx.error ?? new Error('IDB transaction aborted'));
        });
      }

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const openRequest = indexedDB.open('llm-tester');
        openRequest.onsuccess = () => resolve(openRequest.result);
        openRequest.onerror = () =>
          reject(openRequest.error ?? new Error('Failed to open llm-tester'));
      });

      try {
        const tx = db.transaction(['providers', 'settings'], 'readwrite');
        const providersStore = tx.objectStore('providers');
        const settingsStore = tx.objectStore('settings');

        const providers = (await requestToPromise(
          providersStore.getAll(),
        )) as Array<{
          id: string;
          name: string;
          isBuiltIn?: boolean;
          apiKey?: string;
          models?: unknown[];
          [key: string]: unknown;
        }>;

        const openai = providers.find((provider) => provider.name === 'OpenAI');
        if (!openai) {
          throw new Error('OpenAI built-in provider was not seeded');
        }

        const updatedProvider = {
          ...openai,
          apiKey,
          models: [
            {
              id: modelId,
              name: modelId,
              displayName: 'GPT-4o mini',
              supportsStreaming: true,
              source: 'manual',
            },
          ],
        };

        await requestToPromise(providersStore.put(updatedProvider));
        await requestToPromise(
          settingsStore.put({
            key: 'model-market-migrated-v1',
            value: true,
          }),
        );
        await requestToPromise(
          settingsStore.put({
            key: 'provider-selection',
            value: { providerId: openai.id, modelId },
          }),
        );

        await waitForTransaction(tx);
      } finally {
        db.close();
      }
    },
    { apiKey: E2E_API_KEY, modelId: E2E_MODEL_ID },
  );
}

/**
 * Boots the app with a usable OpenAI provider/model selection and no live APIs.
 */
export async function openReadyWorkspace(page: Page): Promise<void> {
  await page.goto('/');
  await waitForAppReady(page);
  await seedOpenAiProvider(page);
  await page.reload();
  await waitForAppReady(page);
  await dismissOnboarding(page);

  await expect(page.getByLabel('Select provider')).toContainText('OpenAI');
  await expect(page.getByLabel('Select model')).toContainText(/gpt-4o-mini/i);
  await expect(
    page.getByRole('button', { name: (name) => name.startsWith('Send') }),
  ).toBeEnabled();
}

export async function fillUserMessage(
  page: Page,
  text: string,
  index = 1,
): Promise<void> {
  const textarea = page.getByLabel(`user message ${index}`);
  await textarea.fill(text);
}

export async function clickSend(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: (name) => name.startsWith('Send') })
    .click();
}

export async function expectAssistantReply(
  page: Page,
  text: string,
): Promise<void> {
  await expect(page.getByLabel('Assistant')).toBeVisible();
  await expect(page.getByText(text)).toBeVisible();
}
