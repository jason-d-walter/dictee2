import { looseKey, normalizeQuotes, splitWords } from './text';

export type WordStatus = 'correct' | 'almost' | 'wrong' | 'missing';

export interface GradedWord {
  expected: string;
  typed?: string;
  status: WordStatus;
}

export interface GradeResult {
  words: GradedWord[];
  extra: string[];
  score: number;  // 0..1; "almost" earns half
}

const CREDIT: Record<WordStatus, number> = { correct: 1, almost: 0.5, wrong: 0, missing: 0 };

/** Longest common subsequence of loose keys: the words she clearly meant to write. */
function matchPairs(expected: string[], typed: string[]): [number, number][] {
  const a = expected.map(looseKey);
  const b = typed.map(looseKey);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) pairs.push([i++, j++]);
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

function gradeMatched(expected: string, typed: string): GradedWord {
  const exact = normalizeQuotes(expected) === normalizeQuotes(typed);
  return { expected, typed, status: exact ? 'correct' : 'almost' };
}

export function gradeSentence(expected: string[], typedText: string): GradeResult {
  const typed = splitWords(typedText);
  const words: GradedWord[] = [];
  const extra: string[] = [];

  // Unmatched words between two matches are paired up in order as misspellings.
  const gradeGap = (e1: number, e2: number, t1: number, t2: number) => {
    for (let k = 0; k < e2 - e1; k++) {
      const typedWord = t1 + k < t2 ? typed[t1 + k] : undefined;
      words.push(typedWord === undefined
        ? { expected: expected[e1 + k], status: 'missing' }
        : { expected: expected[e1 + k], typed: typedWord, status: 'wrong' });
    }
    extra.push(...typed.slice(t1 + (e2 - e1), t2));
  };

  let e = 0;
  let t = 0;
  for (const [ei, ti] of matchPairs(expected, typed)) {
    gradeGap(e, ei, t, ti);
    words.push(gradeMatched(expected[ei], typed[ti]));
    e = ei + 1;
    t = ti + 1;
  }
  gradeGap(e, expected.length, t, typed.length);

  const earned = words.reduce((sum, w) => sum + CREDIT[w.status], 0);
  return { words, extra, score: expected.length ? earned / expected.length : 0 };
}
