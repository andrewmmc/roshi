import type { ProviderConfig } from '@/types/provider';
import type { NormalizedRequest, NormalizedMessage } from '@/types/normalized';
import type {
  EvalRunner,
  EvalRunResult,
  EvalSharedRequest,
  JudgeConfig,
  JudgeCriterionScore,
  JudgeResult,
} from '@/types/eval';
import { sendRequest, RequestError } from './llm-client';

export const DEFAULT_JUDGE_RUBRIC = `You are an impartial judge evaluating responses from multiple AI models.

For each candidate response, score the following criteria from 1 (poor) to 5 (excellent):
- helpfulness: does it actually answer the request?
- accuracy: is it factually correct and free of hallucinations?
- clarity: is it well-organized and easy to read?

Then assign an "overall" 1-5 score and a one-sentence "rationale".
Finally, pick the single best candidate as "winner".

Respond with ONLY a JSON object in this exact shape and no extra commentary:
{
  "scores": {
    "<candidateId>": {
      "helpfulness": 1-5,
      "accuracy": 1-5,
      "clarity": 1-5,
      "overall": 1-5,
      "rationale": "..."
    }
  },
  "winner": "<candidateId>"
}`;

export interface RunJudgeOptions {
  config: JudgeConfig;
  providers: ProviderConfig[];
  request: EvalSharedRequest;
  runners: EvalRunner[];
  results: EvalRunResult[];
  signal?: AbortSignal;
}

export interface RunJudgeHandle {
  promise: Promise<JudgeResult>;
  cancel: () => void;
}

export function runJudge(options: RunJudgeOptions): RunJudgeHandle {
  const controller = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  return {
    promise: runJudgeInternal({ ...options, signal }),
    cancel: () => controller.abort(),
  };
}

async function runJudgeInternal(
  options: RunJudgeOptions & { signal: AbortSignal },
): Promise<JudgeResult> {
  const { config, providers, request, runners, results, signal } = options;

  if (!config.enabled || !config.runner) {
    return emptyJudgeResult('Judge not enabled');
  }

  const provider = providers.find((p) => p.id === config.runner!.providerId);
  if (!provider) {
    return emptyJudgeResult('Judge provider not found');
  }
  if (!provider.apiKey) {
    return emptyJudgeResult('Judge provider has no API key');
  }

  const candidates = runners
    .map((runner) => {
      const result = results.find((r) => r.runnerId === runner.id);
      return result ? { runner, result } : null;
    })
    .filter(
      (c): c is { runner: EvalRunner; result: EvalRunResult } =>
        c !== null && c.result.status === 'success' && !!c.result.content,
    );

  if (candidates.length === 0) {
    return emptyJudgeResult('No successful candidate responses to judge');
  }

  const judgeMessages = buildJudgeMessages({
    rubric: config.rubric || DEFAULT_JUDGE_RUBRIC,
    request,
    candidates,
  });

  const judgeRequest: NormalizedRequest = {
    messages: judgeMessages,
    model: config.runner.modelId,
    stream: false,
    temperature: 0,
  };

  try {
    const sendResult = await sendRequest({
      provider,
      request: judgeRequest,
      signal,
    });

    return parseJudgeContent(sendResult.response.content, candidates);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return emptyJudgeResult('Judge run cancelled');
    }
    if (err instanceof RequestError) {
      return emptyJudgeResult(`Judge call failed: ${err.message}`);
    }
    const message =
      err instanceof Error ? err.message : `Unknown error: ${String(err)}`;
    return emptyJudgeResult(`Judge call failed: ${message}`);
  }
}

interface BuildJudgeMessagesArgs {
  rubric: string;
  request: EvalSharedRequest;
  candidates: { runner: EvalRunner; result: EvalRunResult }[];
}

function buildJudgeMessages(args: BuildJudgeMessagesArgs): NormalizedMessage[] {
  const { rubric, request, candidates } = args;
  const promptSummary = summarizePrompt(request);

  const candidateBlocks = candidates
    .map(({ runner, result }, index) => {
      const label = String.fromCharCode(65 + index);
      return [
        `# Candidate ${label} (id: ${runner.id})`,
        `Model: ${runner.label}`,
        '',
        result.content,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  const userContent = [
    'You will receive the original prompt and several candidate responses.',
    'Apply the rubric and respond with ONLY the JSON object described.',
    '',
    '## Original prompt',
    promptSummary,
    '',
    '## Candidate responses',
    candidateBlocks,
    '',
    'IMPORTANT: keys of the "scores" object MUST be the exact candidate ids above.',
  ].join('\n');

  return [
    { role: 'system', content: rubric },
    { role: 'user', content: userContent },
  ];
}

function summarizePrompt(request: EvalSharedRequest): string {
  const parts: string[] = [];
  if (request.systemPrompt) {
    parts.push(`(system) ${request.systemPrompt}`);
  }
  for (const message of request.messages) {
    if (!message.content.trim()) continue;
    parts.push(`(${message.role}) ${message.content}`);
  }
  return parts.join('\n');
}

interface CandidatePair {
  runner: EvalRunner;
  result: EvalRunResult;
}

export function parseJudgeContent(
  content: string,
  candidates: CandidatePair[],
): JudgeResult {
  const trimmed = content.trim();
  const json = extractJson(trimmed);
  if (!json) {
    return {
      scores: {},
      winnerRunnerId: null,
      rawContent: content,
      error: 'Judge returned non-JSON content',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      scores: {},
      winnerRunnerId: null,
      rawContent: content,
      error: `Could not parse judge JSON: ${(err as Error).message}`,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      scores: {},
      winnerRunnerId: null,
      rawContent: content,
      error: 'Judge JSON was not an object',
    };
  }

  const root = parsed as Record<string, unknown>;
  const scores: Record<string, JudgeCriterionScore> = {};
  const rawScores = isRecord(root.scores) ? root.scores : null;

  if (rawScores) {
    for (const candidate of candidates) {
      const entry = rawScores[candidate.runner.id];
      const score = coerceCriterionScore(entry);
      if (score) scores[candidate.runner.id] = score;
    }
  }

  const winner = typeof root.winner === 'string' ? root.winner : null;
  const winnerRunnerId =
    winner && candidates.some((c) => c.runner.id === winner) ? winner : null;

  return {
    scores,
    winnerRunnerId,
    rawContent: content,
    error: null,
  };
}

function extractJson(text: string): string | null {
  if (!text) return null;
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function coerceCriterionScore(value: unknown): JudgeCriterionScore | null {
  if (!isRecord(value)) return null;
  const helpfulness = clampScore(value.helpfulness);
  const accuracy = clampScore(value.accuracy);
  const clarity = clampScore(value.clarity);
  const overall = clampScore(
    value.overall ?? (helpfulness + accuracy + clarity) / 3,
  );
  const rationale =
    typeof value.rationale === 'string' ? value.rationale.trim() : '';
  return { helpfulness, accuracy, clarity, overall, rationale };
}

function clampScore(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 1) return 1;
  if (num > 5) return 5;
  return Math.round(num * 10) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emptyJudgeResult(error: string | null): JudgeResult {
  return {
    scores: {},
    winnerRunnerId: null,
    rawContent: '',
    error,
  };
}
