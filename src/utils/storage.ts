import { WordProgress } from '../types';

const STORAGE_KEYS = {
  PROGRESS: 'dictee_progress',
} as const;

export function saveProgress(progress: Record<string, WordProgress>): void {
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

export function loadProgress(): Record<string, WordProgress> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
}
