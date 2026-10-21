const WORD_RE = /[\p{L}\p{N}'’-]+/gu;

export function normalizeQuotes(text: string): string {
  return text.replace(/’/g, "'");
}

/** Lowercase without accents: the comparison key for "close enough". */
export function looseKey(word: string): string {
  return normalizeQuotes(word).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function splitWords(text: string): string[] {
  return normalizeQuotes(text).match(WORD_RE) ?? [];
}

/** Split a word into plain and focus-sound parts, e.g. "toit" with "oi" -> t | oi | t. */
export function splitFocus(word: string, focus: string): { text: string; focus: boolean }[] {
  const parts: { text: string; focus: boolean }[] = [];
  const lower = word.toLowerCase();
  let index = 0;
  while (index < word.length) {
    const hit = focus ? lower.indexOf(focus.toLowerCase(), index) : -1;
    if (hit === -1) {
      parts.push({ text: word.slice(index), focus: false });
      break;
    }
    if (hit > index) parts.push({ text: word.slice(index, hit), focus: false });
    parts.push({ text: word.slice(hit, hit + focus.length), focus: true });
    index = hit + focus.length;
  }
  return parts;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
