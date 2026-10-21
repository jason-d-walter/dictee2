import { useCallback, useState } from 'react';
import { SentenceProgress } from '../types';
import { loadJson, saveJson } from '../utils/storage';

const STORAGE_KEY = 'dictee3_progress';
const EMPTY: SentenceProgress = { explored: false, blanksStep: 0, dicteeBest: 0 };

type ProgressMap = Record<string, SentenceProgress>;

export function progressKey(weekPath: string, sentenceId: string): string {
  return `${weekPath}/${sentenceId}`;
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => loadJson<ProgressMap>(STORAGE_KEY, {}));

  const update = useCallback((key: string, change: (current: SentenceProgress) => SentenceProgress) => {
    setProgress(prev => {
      const next = { ...prev, [key]: change(prev[key] ?? EMPTY) };
      saveJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const getProgress = useCallback((key: string) => progress[key] ?? EMPTY, [progress]);

  const markExplored = useCallback((key: string) => update(key, p => ({ ...p, explored: true })), [update]);

  const recordBlanks = useCallback(
    (key: string, step: number) => update(key, p => ({ ...p, blanksStep: Math.max(p.blanksStep, step) })),
    [update],
  );

  const recordDictee = useCallback(
    (key: string, score: number) => update(key, p => ({ ...p, dicteeBest: Math.max(p.dicteeBest, score) })),
    [update],
  );

  return { getProgress, markExplored, recordBlanks, recordDictee };
}
