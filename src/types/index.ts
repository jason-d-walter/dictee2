export interface Word {
  id: string;
  text: string;
  sentence?: string;
  audioWord?: string;    // Path to word audio file
  audioSentence?: string; // Path to sentence audio file
  image?: string;         // Path to image file
}

export interface WordProgress {
  wordId: string;
  correctStreak: number;
  totalAttempts: number;
  totalCorrect: number;
  lastPracticed: number;
  mastered: boolean;
}

export interface GameSession {
  mode: GameMode;
  words: Word[];
  currentIndex: number;
  stars: number;
  completed: boolean;
  results: WordResult[];
}

export interface WordResult {
  wordId: string;
  correct: boolean;
  attempts: number;
}

export type GameMode = 'audio-match' | 'lettres-perdues' | 'dictee-fantome' | 'exploration';

export interface WordManifest {
  generatedAt: string;
  words: Word[];
}

export interface WeekEntry {
  sounds: string;
  path?: string;
  week_start: string;
  week_end: string;
  date_of_generation: string;
  source: string;
}

export interface DicteeMetadata {
  dictee: WeekEntry[];
}
