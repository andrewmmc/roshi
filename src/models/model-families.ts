/**
 * Model-family predicates shared by provider adapters and code generators.
 *
 * Keeping these in one place prevents the generated snippets in
 * `src/services/codegen/` from drifting away from the request bodies actually
 * sent by `src/adapters/`.
 */

const ANTHROPIC_NEXT_GEN =
  /^claude-(?:opus|sonnet|fable|mythos)-(?:[5-9]|\d{2})(?:-|$)/;

function anthropicOpus4Minor(model: string): number | null {
  const match = model.match(/^claude-opus-4-(\d{1,2})(?:-|$)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Models that only support adaptive thinking (`{ type: "adaptive" }`);
 * manual extended-thinking budgets were removed for these families.
 */
export function usesAnthropicAdaptiveThinking(model: string): boolean {
  const opus4 = anthropicOpus4Minor(model);
  if (opus4 !== null) return opus4 >= 6;
  if (/^claude-sonnet-4-6(?:-|$)/.test(model)) return true;
  return ANTHROPIC_NEXT_GEN.test(model);
}

/**
 * Models that reject legacy sampling parameters (temperature, top_p, top_k)
 * with a 400 error when non-default values are sent.
 */
export function anthropicRejectsSamplingParams(model: string): boolean {
  const opus4 = anthropicOpus4Minor(model);
  if (opus4 !== null) return opus4 >= 7;
  return ANTHROPIC_NEXT_GEN.test(model);
}

export function isOpenAIGpt5Family(model: string): boolean {
  return /^gpt-5(?:\.|-|$)/.test(model);
}

/**
 * Reasoning models on the Chat Completions API: they require
 * `max_completion_tokens` and reject legacy sampling parameters.
 */
export function isOpenAIReasoningModel(model: string): boolean {
  return isOpenAIGpt5Family(model) || /^o\d(?:-|$)/.test(model);
}

/**
 * Gemini 3+ replaced `thinkingBudget` with the discrete `thinkingLevel`.
 */
export function usesGeminiThinkingLevel(model: string): boolean {
  return /^gemini-(?:[3-9]|\d{2,})(?:[.-]|$)/.test(model);
}
