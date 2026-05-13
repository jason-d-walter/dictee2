import { useState, useEffect, useCallback } from 'react';
import { Word, WordProgress } from '../types';
import { loadProgress, saveProgress } from '../utils/storage';


const MASTERY_THRESHOLD = 3; // Correct streak needed for mastery

interface UseProgressReturn {
  progress: Record<string, WordProgress>;
  recordAttempt: (wordId: string, correct: boolean) => void;
  getWordsForPractice: (words: Word[], limit: number) => Word[];
  resetProgress: () => void;
  getMasteryCount: (words: Word[]) => number;
}

export function useProgress(): UseProgressReturn {
  const [progress, setProgress] = useState<Record<string, WordProgress>>({});

  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
  }, []);

  const recordAttempt = useCallback((wordId: string, correct: boolean) => {
    setProgress(prev => {
      const existing = prev[wordId] || {
        wordId,
        correctStreak: 0,
        totalAttempts: 0,
        totalCorrect: 0,
        lastPracticed: 0,
        mastered: false,
      };

      const newStreak = correct ? existing.correctStreak + 1 : 0;
      const updated: WordProgress = {
        ...existing,
        correctStreak: newStreak,
        totalAttempts: existing.totalAttempts + 1,
        totalCorrect: existing.totalCorrect + (correct ? 1 : 0),
        lastPracticed: Date.now(),
        mastered: newStreak >= MASTERY_THRESHOLD,
      };

      const newProgress = { ...prev, [wordId]: updated };
      saveProgress(newProgress);
      return newProgress;
    });
  }, []);

  const getWordsForPractice = useCallback(
    (words: Word[], limit: number): Word[] => {
      if (words.length === 0) return [];

      const wordWeight = (word: Word): number => {
        const p = progress[word.id];
        if (!p) return 10;           // unpracticed
        if (!p.mastered) return 6;   // practiced but not mastered
        return 1;                    // mastered
      };

      // Weighted random sampling without replacement
      const pool = words.map(w => ({ word: w, weight: wordWeight(w) }));
      const selected: Word[] = [];
      const count = Math.min(limit, words.length);

      for (let i = 0; i < count; i++) {
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let r = Math.random() * totalWeight;
        const idx = pool.findIndex(item => {
          r -= item.weight;
          return r <= 0;
        });
        const pick = idx === -1 ? pool.length - 1 : idx;
        selected.push(pool[pick].word);
        pool.splice(pick, 1);
      }

      return selected;
    },
    [progress]
  );

  const resetProgress = useCallback(() => {
    setProgress({});
    saveProgress({});
  }, []);

  const getMasteryCount = useCallback(
    (words: Word[]): number => {
      return words.filter(w => progress[w.id]?.mastered).length;
    },
    [progress]
  );

  return { progress, recordAttempt, getWordsForPractice, resetProgress, getMasteryCount };
}
