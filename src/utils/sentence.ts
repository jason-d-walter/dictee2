import { Sentence, Token } from '../types';

const SEGMENT_TAIL_SECONDS = 0.15;

/** For each token, its position among the sentence's words (-1 for punctuation). */
export function wordIndexes(tokens: Token[]): number[] {
  let next = 0;
  return tokens.map(token => (token.word ? next++ : -1));
}

export function sentenceWords(sentence: Sentence): string[] {
  return sentence.tokens.filter(t => t.word).map(t => t.text);
}

export function segmentCount(sentence: Sentence): number {
  return Math.max(...sentence.tokens.map(t => t.segment)) + 1;
}

export function segmentText(sentence: Sentence, segment: number): string {
  return sentence.tokens
    .filter(t => t.segment === segment)
    .map(t => t.text + (t.space ? ' ' : ''))
    .join('')
    .trim();
}

/** Audio time range of each dictation group, with a short tail so the last word isn't clipped. */
export function segmentRanges(sentence: Sentence): [number, number][] {
  const indexes = wordIndexes(sentence.tokens);
  const ranges: [number, number][] = [];
  sentence.tokens.forEach((token, tokenIndex) => {
    const wordIndex = indexes[tokenIndex];
    if (wordIndex === -1) return;
    const [start, end] = sentence.words[wordIndex];
    const range = ranges[token.segment];
    ranges[token.segment] = range ? [range[0], end] : [start, end];
  });
  return ranges.map(([start, end], i) => {
    const limit = ranges[i + 1]?.[0] ?? sentence.duration;
    return [start, Math.min(end + SEGMENT_TAIL_SECONDS, limit)];
  });
}
