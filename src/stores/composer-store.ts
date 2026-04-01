import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { NormalizedMessage, MessageAttachment } from '@/types/normalized';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_THINKING_ENABLED,
  DEFAULT_THINKING_BUDGET_TOKENS,
} from '@/constants/defaults';
import type { HistoryHeaderEntry } from '@/types/history';
import { useResponseStore } from '@/stores/response-store';

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

interface ComposerState {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  customHeaders: HeaderEntry[];
  scrollGeneration: number;
}

interface ComposerActions {
  setMessages: (messages: NormalizedMessage[]) => void;
  addMessage: (message: NormalizedMessage) => void;
  updateMessage: (index: number, message: NormalizedMessage) => void;
  removeMessage: (index: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setTopP: (topP: number) => void;
  setTopK: (topK: number) => void;
  setFrequencyPenalty: (penalty: number) => void;
  setPresencePenalty: (penalty: number) => void;
  setStream: (stream: boolean) => void;
  setThinkingEnabled: (enabled: boolean) => void;
  setThinkingBudgetTokens: (tokens: number) => void;
  addAttachment: (messageIndex: number, attachment: MessageAttachment) => void;
  removeAttachment: (messageIndex: number, attachmentId: string) => void;
  setCustomHeaders: (headers: HeaderEntry[]) => void;
  resetComposer: () => void;
  loadComposerFromHistory: (data: {
    messages: NormalizedMessage[];
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    topK?: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stream: boolean;
    thinkingEnabled?: boolean;
    thinkingBudgetTokens?: number;
    customHeaders?: HistoryHeaderEntry[];
  }) => void;
}

export type ComposerStore = ComposerState & ComposerActions;

const INITIAL_COMPOSER_STATE: ComposerState = {
  messages: [{ id: nanoid(), role: 'user', content: '' }],
  systemPrompt: '',
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
  topP: DEFAULT_TOP_P,
  topK: DEFAULT_TOP_K,
  frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
  presencePenalty: DEFAULT_PRESENCE_PENALTY,
  stream: true,
  thinkingEnabled: DEFAULT_THINKING_ENABLED,
  thinkingBudgetTokens: DEFAULT_THINKING_BUDGET_TOKENS,
  customHeaders: [{ id: nanoid(), key: '', value: '' }],
  scrollGeneration: 0,
};

/**
 * Returns true when the composer has user-typed content that hasn't been sent.
 * "Dirty" = at least one message has non-empty content, or a system prompt is
 * set, AND no request has been sent yet (sentRequest is null — once a request
 * is sent the content is saved to history so losing it is harmless).
 */
export function selectHasUnsavedChanges(state: ComposerState): boolean {
  const { sentRequest } = useResponseStore.getState();

  if (sentRequest !== null) {
    // After a response is appended, check if the user has typed new content
    // in messages beyond what was originally sent
    const sentCount = sentRequest.messages.length;
    return state.messages
      .slice(sentCount)
      .filter((m) => m.role === 'user')
      .some(
        (m) =>
          m.content.trim() !== '' ||
          (m.attachments && m.attachments.length > 0),
      );
  }

  if (state.systemPrompt.trim() !== '') return true;
  return state.messages.some(
    (m) =>
      m.content.trim() !== '' || (m.attachments && m.attachments.length > 0),
  );
}

export const useComposerStore = create<ComposerStore>((set) => ({
  ...INITIAL_COMPOSER_STATE,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, { ...message, id: message.id || nanoid() }],
    })),
  updateMessage: (index, message) =>
    set((s) => ({
      messages: s.messages.map((m, i) => (i === index ? message : m)),
    })),
  removeMessage: (index) =>
    set((s) => ({ messages: s.messages.filter((_, i) => i !== index) })),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setTopP: (topP) => set({ topP }),
  setTopK: (topK) => set({ topK }),
  setFrequencyPenalty: (frequencyPenalty) => set({ frequencyPenalty }),
  setPresencePenalty: (presencePenalty) => set({ presencePenalty }),
  setStream: (stream) => set({ stream }),
  setThinkingEnabled: (thinkingEnabled) => set({ thinkingEnabled }),
  setThinkingBudgetTokens: (thinkingBudgetTokens) =>
    set({ thinkingBudgetTokens }),
  addAttachment: (messageIndex, attachment) =>
    set((s) => ({
      messages: s.messages.map((m, i) =>
        i === messageIndex
          ? { ...m, attachments: [...(m.attachments || []), attachment] }
          : m,
      ),
    })),
  removeAttachment: (messageIndex, attachmentId) =>
    set((s) => ({
      messages: s.messages.map((m, i) =>
        i === messageIndex
          ? {
              ...m,
              attachments: (m.attachments || []).filter(
                (a) => a.id !== attachmentId,
              ),
            }
          : m,
      ),
    })),
  setCustomHeaders: (customHeaders) => set({ customHeaders }),

  resetComposer: () =>
    set({
      messages: [{ id: nanoid(), role: 'user', content: '' }],
      systemPrompt: '',
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      topP: DEFAULT_TOP_P,
      topK: DEFAULT_TOP_K,
      frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: DEFAULT_PRESENCE_PENALTY,
      stream: true,
      thinkingEnabled: DEFAULT_THINKING_ENABLED,
      thinkingBudgetTokens: DEFAULT_THINKING_BUDGET_TOKENS,
      customHeaders: [{ id: nanoid(), key: '', value: '' }],
    }),

  loadComposerFromHistory: (data) =>
    set((s) => ({
      messages: data.messages.map((m) => ({ ...m, id: m.id || nanoid() })),
      systemPrompt: data.systemPrompt,
      customHeaders:
        (data.customHeaders ?? []).length > 0
          ? (data.customHeaders ?? []).map((header) => ({
              ...header,
              id: nanoid(),
            }))
          : [{ id: nanoid(), key: '', value: '' }],
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      topP: data.topP,
      topK: data.topK ?? DEFAULT_TOP_K,
      frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
      stream: data.stream,
      thinkingEnabled: data.thinkingEnabled ?? DEFAULT_THINKING_ENABLED,
      thinkingBudgetTokens:
        data.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS,
      scrollGeneration: s.scrollGeneration + 1,
    })),
}));
