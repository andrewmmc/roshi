import { diffWords, jaccardSimilarity } from './diff';

describe('diffWords', () => {
  it('returns a single equal segment for identical text', () => {
    expect(diffWords('hello world', 'hello world')).toEqual([
      { op: 'equal', value: 'hello world' },
    ]);
  });

  it('returns nothing for empty strings on both sides', () => {
    expect(diffWords('', '')).toEqual([]);
  });

  it('returns a single insert when the left is empty', () => {
    expect(diffWords('', 'hi there')).toEqual([
      { op: 'insert', value: 'hi there' },
    ]);
  });

  it('returns a single delete when the right is empty', () => {
    expect(diffWords('hi there', '')).toEqual([
      { op: 'delete', value: 'hi there' },
    ]);
  });

  it('marks inserted and deleted words while preserving equal runs', () => {
    const segments = diffWords('the quick brown fox', 'the slow brown cat');
    const reconstructLeft = segments
      .filter((s) => s.op !== 'insert')
      .map((s) => s.value)
      .join('');
    const reconstructRight = segments
      .filter((s) => s.op !== 'delete')
      .map((s) => s.value)
      .join('');
    expect(reconstructLeft).toBe('the quick brown fox');
    expect(reconstructRight).toBe('the slow brown cat');

    const deletes = segments
      .filter((s) => s.op === 'delete')
      .map((s) => s.value.trim())
      .filter(Boolean);
    const inserts = segments
      .filter((s) => s.op === 'insert')
      .map((s) => s.value.trim())
      .filter(Boolean);
    expect(deletes).toEqual(expect.arrayContaining(['quick', 'fox']));
    expect(inserts).toEqual(expect.arrayContaining(['slow', 'cat']));
  });

  it('collapses adjacent same-op segments', () => {
    const segments = diffWords('a b c', 'x y c');
    const ops = segments.map((s) => s.op);
    // No two adjacent ops should be identical after collapsing.
    for (let i = 1; i < ops.length; i++) {
      expect(ops[i]).not.toBe(ops[i - 1]);
    }
  });

  it('falls back to a single delete + insert when inputs are huge', () => {
    const left = 'a '.repeat(2000).trim();
    const right = 'b '.repeat(2000).trim();
    const segments = diffWords(left, right);
    expect(segments).toEqual([
      { op: 'delete', value: left },
      { op: 'insert', value: right },
    ]);
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1 for two empty strings', () => {
    expect(jaccardSimilarity('', '')).toBe(1);
  });

  it('returns 1 for identical strings', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('returns 0 when no tokens overlap', () => {
    expect(jaccardSimilarity('a b c', 'd e f')).toBe(0);
  });

  it('returns intersection over union for partially overlapping strings', () => {
    expect(jaccardSimilarity('a b c', 'b c d')).toBeCloseTo(2 / 4, 6);
  });

  it('ignores whitespace-only tokens', () => {
    expect(jaccardSimilarity('a   b', 'a b')).toBe(1);
  });
});
