import { useCallback, useState } from 'react';
import { loadJson, saveJson } from '../utils/storage';

const STORAGE_KEY = 'dictee3_speed';

export const SPEEDS = [
  { rate: 0.6, label: '🐢', name: 'Très lent' },
  { rate: 0.75, label: '🐌', name: 'Lent' },
  { rate: 0.9, label: '🚶', name: 'Moyen' },
  { rate: 1, label: '🐇', name: 'Normal' },
] as const;

export function useSpeed() {
  const [rate, setRateState] = useState<number>(() => loadJson(STORAGE_KEY, 0.75));

  const setRate = useCallback((value: number) => {
    setRateState(value);
    saveJson(STORAGE_KEY, value);
  }, []);

  return { rate, setRate };
}
