import { useState, useEffect, useCallback } from 'react';
import { WeekEntry } from '../types';
import { fetchMetadata } from '../utils/fetchMetadata';

interface UseMetadataReturn {
  weeks: WeekEntry[];
  selectedWeek: WeekEntry | null;
  selectWeek: (week: WeekEntry) => void;
  loading: boolean;
}

export function useMetadata(): UseMetadataReturn {
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetadata().then((metadata) => {
      if (metadata) {
        // Sort by week_start descending (most recent first)
        const sorted = [...metadata.dictee].sort(
          (a, b) => b.week_start.localeCompare(a.week_start)
        );
        setWeeks(sorted);
        // Auto-select most recent week
        if (sorted.length > 0) {
          setSelectedWeek(sorted[0]);
        }
      }
      setLoading(false);
    });
  }, []);

  const selectWeek = useCallback((week: WeekEntry) => {
    setSelectedWeek(week);
  }, []);

  return { weeks, selectedWeek, selectWeek, loading };
}
