import { SupportedLanguage } from '../types';

// Letter patterns to target for missing letter mode, keyed by language
const LANGUAGE_PATTERNS: Record<SupportedLanguage, string[]> = {
  fr: ['ou', 'on', 'ch', 'oi', 'an', 'en', 'ai', 'au', 'eau', 'ei', 'eu'],
  en: ['th', 'sh', 'ch', 'ck', 'ee', 'oo', 'ea', 'ou', 'igh', 'ai', 'oa'],
};

interface MissingLetterResult {
  displayWord: string;
  missingLetters: string[];
  missingIndices: number[];
}

export function generateMissingLetters(word: string, count: number = 1, language: SupportedLanguage = 'fr'): MissingLetterResult {
  const letters = word.split('');
  const missingIndices: number[] = [];
  const missingLetters: string[] = [];

  const patterns = LANGUAGE_PATTERNS[language] ?? LANGUAGE_PATTERNS.fr;

  // Try to find and remove language-specific patterns first
  for (const pattern of patterns) {
    const patternIndex = word.toLowerCase().indexOf(pattern);
    if (patternIndex > 0 && patternIndex < word.length - pattern.length) {
      // Found a pattern not at start or end
      const removeIndex = patternIndex + Math.floor(pattern.length / 2);
      if (!missingIndices.includes(removeIndex)) {
        missingIndices.push(removeIndex);
        missingLetters.push(letters[removeIndex]);
        if (missingIndices.length >= count) break;
      }
    }
  }

  // If we need more missing letters, pick random middle positions
  while (missingIndices.length < count && word.length > 2) {
    // Pick a random position, avoiding first and last
    const availableIndices = [];
    for (let i = 1; i < word.length - 1; i++) {
      if (!missingIndices.includes(i)) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) break;

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    missingIndices.push(randomIndex);
    missingLetters.push(letters[randomIndex]);
  }

  // Sort indices for consistent display
  missingIndices.sort((a, b) => a - b);

  // Create display word with blanks
  const displayLetters = letters.map((letter, index) =>
    missingIndices.includes(index) ? '_' : letter
  );

  return {
    displayWord: displayLetters.join(''),
    missingLetters: missingIndices.map(i => letters[i]),
    missingIndices,
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomWords(words: { text: string }[], count: number, exclude?: string): string[] {
  // Get unique word texts, excluding the specified word
  const uniqueTexts = [...new Set(words.map(w => w.text))].filter(text => text !== exclude);
  const shuffled = shuffleArray(uniqueTexts);
  return shuffled.slice(0, count);
}

export function normalizeForComparison(text: string): string {
  return text.toLowerCase().trim();
}

export function compareAnswers(answer: string, correct: string): boolean {
  return normalizeForComparison(answer) === normalizeForComparison(correct);
}
