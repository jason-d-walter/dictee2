import { WeekEntry, WeekManifest } from '../types';

const WEEKS_ROOT = '/weeks';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchWeeks(): Promise<WeekEntry[]> {
  const { weeks } = await fetchJson<{ weeks: WeekEntry[] }>(`${WEEKS_ROOT}/index.json`);
  return [...weeks].sort((a, b) => b.week_start.localeCompare(a.week_start));
}

export async function fetchManifest(week: WeekEntry): Promise<WeekManifest> {
  const base = `${WEEKS_ROOT}/${week.path}`;
  const manifest = await fetchJson<WeekManifest>(`${base}/manifest.json`);
  return {
    ...manifest,
    sentences: manifest.sentences.map(s => ({ ...s, audio: `${base}/${s.audio}` })),
  };
}
