import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { db } from '@/db';

function App() {
  const loadProviders = useProviderStore((s) => s.load);
  const loadHistory = useHistoryStore((s) => s.load);

  useEffect(() => {
    loadProviders();
    loadHistory();
    
    // Add demo history entries for testing token pricing UI
    const initDemoData = async () => {
      const existingEntries = await db.history.count();
      if (existingEntries === 0) {
        await db.history.bulkAdd([
          {
            id: crypto.randomUUID(),
            providerId: 'openai-1',
            providerName: 'OpenAI',
            providerType: 'openai',
            modelId: 'gpt-4',
            request: {
              messages: [{ role: 'user', content: 'Explain quantum computing in simple terms' }],
              model: 'gpt-4',
              temperature: 0.7,
              maxTokens: 500,
              stream: false,
            },
            rawRequest: {},
            response: {
              id: 'chatcmpl-123',
              model: 'gpt-4',
              content: 'Quantum computing uses quantum mechanics principles like superposition and entanglement to process information in ways classical computers cannot. Instead of bits that are either 0 or 1, quantum computers use qubits that can exist in multiple states simultaneously.',
              role: 'assistant',
              finishReason: 'stop',
              usage: {
                promptTokens: 12,
                completionTokens: 156,
                totalTokens: 168,
              },
            },
            rawResponse: {},
            error: null,
            durationMs: 3240,
            statusCode: 200,
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            id: crypto.randomUUID(),
            providerId: 'anthropic-1',
            providerName: 'Anthropic',
            providerType: 'anthropic',
            modelId: 'claude-3-opus-20240229',
            request: {
              messages: [{ role: 'user', content: 'Write a short poem about coding' }],
              model: 'claude-3-opus-20240229',
              temperature: 1.0,
              stream: false,
            },
            rawRequest: {},
            response: {
              id: 'msg-456',
              model: 'claude-3-opus-20240229',
              content: 'Lines of logic dance and flow,\nFunctions nested, row by row,\nVariables hold secrets tight,\nDebugging through the endless night.',
              role: 'assistant',
              finishReason: 'end_turn',
              usage: {
                promptTokens: 8,
                completionTokens: 89,
                totalTokens: 97,
              },
            },
            rawResponse: {},
            error: null,
            durationMs: 2100,
            statusCode: 200,
            createdAt: new Date(Date.now() - 1800000),
          },
          {
            id: crypto.randomUUID(),
            providerId: 'openai-1',
            providerName: 'OpenAI',
            providerType: 'openai',
            modelId: 'gpt-3.5-turbo',
            request: {
              messages: [{ role: 'user', content: 'What is TypeScript?' }],
              model: 'gpt-3.5-turbo',
              temperature: 0.5,
              stream: false,
            },
            rawRequest: {},
            response: {
              id: 'chatcmpl-789',
              model: 'gpt-3.5-turbo',
              content: 'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.',
              role: 'assistant',
              finishReason: 'stop',
              usage: {
                promptTokens: 6,
                completionTokens: 42,
                totalTokens: 48,
              },
            },
            rawResponse: {},
            error: null,
            durationMs: 890,
            statusCode: 200,
            createdAt: new Date(),
          },
        ]);
        // Reload history to show the new entries
        await loadHistory();
      }
    };
    initDemoData();
  }, [loadProviders, loadHistory]);

  return <AppLayout />;
}

export default App;
