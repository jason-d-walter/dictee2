export interface Token {
  text: string;
  space: boolean;     // whitespace follows this token
  segment: number;    // dictation group the token belongs to
  word?: boolean;     // false/absent for punctuation
  focus?: boolean;    // contains the week's sound
}

export interface Sentence {
  id: string;
  day?: number;
  text: string;
  tokens: Token[];
  audio: string;              // absolute URL once loaded
  duration: number;
  words: [number, number][];  // [start, end] seconds for each word token, in order
}

export interface WeekManifest {
  focus: string;
  sentences: Sentence[];
}

export interface WeekEntry {
  path: string;
  focus: string;
  week_start: string;
  week_end: string;
}

export type Level = 'explorer' | 'mots-manquants' | 'dictee';

export type BlankStep = 1 | 2 | 3;

export interface SentenceProgress {
  explored: boolean;
  blanksStep: number;   // highest Mots manquants step passed (0 = none)
  dicteeBest: number;   // best Dictée score, 0..1
}

export interface SentenceResult {
  sentenceId: string;
  score: number;        // 0..1
}
