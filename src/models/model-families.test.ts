import { describe, it, expect } from 'vitest';
import {
  anthropicRejectsSamplingParams,
  getGeminiThinkingConfig,
  isOpenAIGpt5Family,
  isOpenAIGpt6Family,
  isOpenAIReasoningModel,
  prefersOpenAIResponses,
  usesAnthropicAdaptiveThinking,
  usesGeminiThinkingLevel,
  usesOpenAIResponsesApi,
} from './model-families';
import { makeProvider } from '@/__tests__/fixtures';

describe('model-families', () => {
  describe('usesAnthropicAdaptiveThinking', () => {
    it('matches Opus 4.6 and newer', () => {
      expect(usesAnthropicAdaptiveThinking('claude-opus-4-6')).toBe(true);
      expect(usesAnthropicAdaptiveThinking('claude-opus-4-7-20260219')).toBe(
        true,
      );
      expect(usesAnthropicAdaptiveThinking('claude-opus-4-8')).toBe(true);
    });

    it('matches Sonnet 4.6 and next-gen families', () => {
      expect(usesAnthropicAdaptiveThinking('claude-sonnet-4-6')).toBe(true);
      expect(usesAnthropicAdaptiveThinking('claude-sonnet-5')).toBe(true);
      expect(usesAnthropicAdaptiveThinking('claude-opus-5-20260101')).toBe(
        true,
      );
      expect(usesAnthropicAdaptiveThinking('claude-fable-5')).toBe(true);
    });

    it('does not match older models', () => {
      expect(usesAnthropicAdaptiveThinking('claude-opus-4-5')).toBe(false);
      expect(usesAnthropicAdaptiveThinking('claude-sonnet-4-20250514')).toBe(
        false,
      );
      expect(usesAnthropicAdaptiveThinking('claude-3-5-sonnet')).toBe(false);
    });
  });

  describe('anthropicRejectsSamplingParams', () => {
    it('matches Opus 4.7 and newer', () => {
      expect(anthropicRejectsSamplingParams('claude-opus-4-7')).toBe(true);
      expect(anthropicRejectsSamplingParams('claude-opus-4-8')).toBe(true);
      expect(anthropicRejectsSamplingParams('claude-sonnet-5')).toBe(true);
    });

    it('still allows sampling on 4.6 models', () => {
      expect(anthropicRejectsSamplingParams('claude-opus-4-6')).toBe(false);
      expect(anthropicRejectsSamplingParams('claude-sonnet-4-6')).toBe(false);
      expect(anthropicRejectsSamplingParams('claude-3-5-sonnet')).toBe(false);
    });
  });

  describe('OpenAI predicates', () => {
    it.each([
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-6-luna',
      'gpt-6.1-sol',
      'gpt-6.1-sol-2026-09-24',
    ])('recognizes %s as a reasoning model preferring Responses', (model) => {
      expect(isOpenAIGpt6Family(model)).toBe(true);
      expect(prefersOpenAIResponses(model)).toBe(true);
      expect(isOpenAIReasoningModel(model)).toBe(true);
    });

    it.each(['gpt-4o', 'gpt-60', 'gpt-6other', 'custom-gpt-6'])(
      'does not overmatch %s',
      (model) => {
        expect(isOpenAIGpt6Family(model)).toBe(false);
        expect(prefersOpenAIResponses(model)).toBe(false);
      },
    );
    it('detects the GPT-5 family', () => {
      expect(isOpenAIGpt5Family('gpt-5')).toBe(true);
      expect(isOpenAIGpt5Family('gpt-5.6-sol')).toBe(true);
      expect(isOpenAIGpt5Family('gpt-4o')).toBe(false);
    });

    it.each([
      'o1-pro',
      'o3-pro-2025-06-10',
      'o3-deep-research',
      'o4-mini-deep-research-2025-06-26',
      'codex-mini-latest',
      'computer-use-preview',
    ])('prefers Responses for Responses-only model %s', (model) => {
      expect(prefersOpenAIResponses(model)).toBe(true);
      expect(isOpenAIReasoningModel(model)).toBe(true);
    });

    it.each(['o3', 'o4-mini', 'o1', 'gpt-4.1', 'gpt-4o-mini'])(
      'keeps %s on Chat Completions',
      (model) => {
        expect(prefersOpenAIResponses(model)).toBe(false);
      },
    );

    it('detects reasoning models on chat completions', () => {
      expect(isOpenAIReasoningModel('o3-mini')).toBe(true);
      expect(isOpenAIReasoningModel('o1')).toBe(true);
      expect(isOpenAIReasoningModel('gpt-5.5')).toBe(true);
      expect(isOpenAIReasoningModel('gpt-4o-mini')).toBe(false);
    });
  });

  describe('usesGeminiThinkingLevel', () => {
    it('matches Gemini 3 and newer', () => {
      expect(usesGeminiThinkingLevel('gemini-3.1-pro-preview')).toBe(true);
      expect(usesGeminiThinkingLevel('gemini-3.6-flash')).toBe(true);
      expect(usesGeminiThinkingLevel('gemini-2.5-flash')).toBe(false);
      expect(usesGeminiThinkingLevel('gemini-1.5-pro')).toBe(false);
    });
  });

  describe('usesOpenAIResponsesApi', () => {
    it('honors a provider configured for the Responses API', () => {
      expect(
        usesOpenAIResponsesApi(
          makeProvider({ protocol: 'openai-responses' }),
          'gpt-4o',
        ),
      ).toBe(true);
    });

    it('routes first-party OpenAI Responses models only for OpenAI', () => {
      const openai = makeProvider({
        name: 'OpenAI',
        protocol: 'openai-chat-completions',
      });
      expect(usesOpenAIResponsesApi(openai, 'o3-pro')).toBe(true);
      expect(usesOpenAIResponsesApi(openai, 'o3')).toBe(false);
      expect(usesOpenAIResponsesApi(makeProvider(), 'o3-pro')).toBe(false);
      expect(
        usesOpenAIResponsesApi(
          makeProvider({ name: 'OpenAI', type: 'anthropic' }),
          'gpt-5.5',
        ),
      ).toBe(false);
    });
  });

  describe('getGeminiThinkingConfig', () => {
    it('uses the selected Gemini 3 thinking level regardless of the toggle', () => {
      expect(
        getGeminiThinkingConfig({ model: 'gemini-3-flash', effort: 'low' }),
      ).toEqual({ thinkingLevel: 'low' });
    });

    it('defaults Gemini 3 to high only when thinking is enabled', () => {
      const thinking = { enabled: true, budgetTokens: 2048 };
      expect(
        getGeminiThinkingConfig({ model: 'gemini-3-pro', thinking }),
      ).toEqual({ thinkingLevel: 'high' });
      expect(
        getGeminiThinkingConfig({ model: 'gemini-3-pro' }),
      ).toBeUndefined();
    });

    it('uses budgets for Gemini 2.5 only when thinking is enabled', () => {
      expect(
        getGeminiThinkingConfig({
          model: 'gemini-2.5-flash',
          effort: 'high',
          thinking: { enabled: true, budgetTokens: 2048 },
        }),
      ).toEqual({ thinkingBudget: 2048 });
      expect(
        getGeminiThinkingConfig({
          model: 'gemini-2.5-flash',
          thinking: { enabled: false, budgetTokens: 2048 },
        }),
      ).toBeUndefined();
    });
  });
});
