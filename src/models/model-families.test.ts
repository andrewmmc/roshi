import { describe, it, expect } from 'vitest';
import {
  anthropicRejectsSamplingParams,
  isOpenAIGpt5Family,
  isOpenAIReasoningModel,
  usesAnthropicAdaptiveThinking,
  usesGeminiThinkingLevel,
} from './model-families';

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
    it('detects the GPT-5 family', () => {
      expect(isOpenAIGpt5Family('gpt-5')).toBe(true);
      expect(isOpenAIGpt5Family('gpt-5.6-sol')).toBe(true);
      expect(isOpenAIGpt5Family('gpt-4o')).toBe(false);
    });

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
});
