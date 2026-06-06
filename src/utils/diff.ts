export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffSegment {
  op: DiffOp;
  value: string;
}

/**
 * Split text into word + whitespace tokens so the diff preserves spacing.
 * Each whitespace run is its own token.
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text.match(/\s+|\S+/g) ?? [];
}

/**
 * Word-level diff between two strings using LCS dynamic programming.
 * For very long inputs we fall back to a single delete + insert pair so we
 * don't allocate an O(n*m) table when one side is hundreds of thousands of
 * tokens — this keeps the UI responsive.
 */
export function diffWords(a: string, b: string): DiffSegment[] {
  if (a === b) {
    return a ? [{ op: 'equal', value: a }] : [];
  }
  if (!a) return [{ op: 'insert', value: b }];
  if (!b) return [{ op: 'delete', value: a }];

  const left = tokenize(a);
  const right = tokenize(b);

  const MAX_CELLS = 1_000_000;
  if (left.length * right.length > MAX_CELLS) {
    return [
      { op: 'delete', value: a },
      { op: 'insert', value: b },
    ];
  }

  return collapseSegments(buildDiff(left, right));
}

function buildDiff(left: string[], right: string[]): DiffSegment[] {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const table = new Uint32Array(rows * cols);

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (left[i - 1] === right[j - 1]) {
        table[i * cols + j] = table[(i - 1) * cols + (j - 1)] + 1;
      } else {
        table[i * cols + j] = Math.max(
          table[(i - 1) * cols + j],
          table[i * cols + (j - 1)],
        );
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = left.length;
  let j = right.length;

  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      segments.unshift({ op: 'equal', value: left[i - 1] });
      i--;
      j--;
    } else if (table[(i - 1) * cols + j] >= table[i * cols + (j - 1)]) {
      segments.unshift({ op: 'delete', value: left[i - 1] });
      i--;
    } else {
      segments.unshift({ op: 'insert', value: right[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    segments.unshift({ op: 'delete', value: left[i - 1] });
    i--;
  }
  while (j > 0) {
    segments.unshift({ op: 'insert', value: right[j - 1] });
    j--;
  }

  return segments;
}

function collapseSegments(segments: DiffSegment[]): DiffSegment[] {
  const collapsed: DiffSegment[] = [];
  for (const segment of segments) {
    if (!segment.value) continue;
    const last = collapsed[collapsed.length - 1];
    if (last && last.op === segment.op) {
      last.value += segment.value;
    } else {
      collapsed.push({ ...segment });
    }
  }
  return collapsed;
}

/**
 * Compute the Jaccard token similarity (intersection over union) between two
 * strings, ignoring pure-whitespace tokens. Returns a value in [0, 1].
 */
export function jaccardSimilarity(a: string, b: string): number {
  const left = new Set(tokenize(a).filter((t) => t.trim()));
  const right = new Set(tokenize(b).filter((t) => t.trim()));
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection++;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 1 : intersection / union;
}
