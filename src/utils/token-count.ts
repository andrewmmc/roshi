import type { NormalizedMessage } from '@/types/normalized';

interface ChatMessage {
  role: string;
  content: string;
}

function buildChatMessages(
  messages: NormalizedMessage[],
  systemPrompt: string,
): ChatMessage[] {
  const chat: ChatMessage[] = [];
  if (systemPrompt.trim()) {
    chat.push({ role: 'system', content: systemPrompt });
  }
  for (const msg of messages) {
    if (msg.content.trim() || msg.role !== 'user') {
      chat.push({ role: msg.role, content: msg.content });
    }
  }
  return chat;
}

/**
 * Estimates token count for a set of chat messages using the o200k_base
 * encoding (used by modern OpenAI models). For non-OpenAI providers the
 * count is still a reasonable approximation since most LLMs tokenize
 * similarly to BPE. The encoder is loaded lazily to avoid blocking startup.
 */
export async function estimateTokenCount(
  messages: NormalizedMessage[],
  systemPrompt: string,
): Promise<number> {
  const chat = buildChatMessages(messages, systemPrompt);
  if (chat.length === 0) return 0;

  const { encodeChat } = await import('gpt-tokenizer');
  const tokens = encodeChat(
    chat as { role: 'system' | 'user' | 'assistant'; content: string }[],
    'gpt-4o',
  );
  return tokens.length;
}
