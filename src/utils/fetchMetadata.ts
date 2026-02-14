import yaml from 'js-yaml';
import { DicteeMetadata, WeekEntry } from '../types';

export async function fetchMetadata(): Promise<DicteeMetadata | null> {
  try {
    const response = await fetch('/metadata.yaml');
    if (!response.ok) return null;
    const text = await response.text();
    const raw = yaml.load(text) as Record<string, unknown>;

    // Backward compat: if dictee is a single object, wrap in array
    let weeks: WeekEntry[];
    if (Array.isArray(raw.dictee)) {
      weeks = raw.dictee as WeekEntry[];
    } else if (raw.dictee && typeof raw.dictee === 'object') {
      weeks = [raw.dictee as WeekEntry];
    } else {
      return null;
    }

    return { dictee: weeks };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}
