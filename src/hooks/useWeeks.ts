import { useEffect, useState } from 'react';
import { WeekEntry, WeekManifest } from '../types';
import { fetchManifest, fetchWeeks } from '../utils/weeks';

interface UseWeeksReturn {
  weeks: WeekEntry[];
  selectedWeek: WeekEntry | null;
  selectWeek: (week: WeekEntry) => void;
  manifest: WeekManifest | null;
  loading: boolean;
  error: boolean;
}

export function useWeeks(): UseWeeksReturn {
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekEntry | null>(null);
  const [manifest, setManifest] = useState<WeekManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWeeks()
      .then(list => {
        setWeeks(list);
        setSelectedWeek(list[0] ?? null);
        if (list.length === 0) setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    let cancelled = false;
    setLoading(true);
    fetchManifest(selectedWeek)
      .then(data => !cancelled && setManifest(data))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedWeek]);

  return { weeks, selectedWeek, selectWeek: setSelectedWeek, manifest, loading, error };
}
