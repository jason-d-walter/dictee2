import { BlankStep, Token } from '../types';
import { shuffle } from './text';

export interface BankWord {
  id: string;
  text: string;
}

const EXTRA_BLANKS_AT_STEP_2 = 2;
const SILENT_ENDINGS = /[tdsxp]$/;

// Spellings that sound alike or look close, used to make believable traps.
const SOUND_ALTERNATIVES: Record<string, string> = {
  oi: 'oa', ou: 'u', on: 'om', an: 'en', en: 'an', in: 'ain', ain: 'in',
  au: 'o', eau: 'au', ai: 'è', é: 'er', er: 'é', ch: 'sh', gn: 'ni', ph: 'f',
};

function wordIndices(tokens: Token[]): number[] {
  return tokens.flatMap((token, index) => (token.word ? [index] : []));
}

function focusIndices(tokens: Token[]): number[] {
  const focus = wordIndices(tokens).filter(i => tokens[i].focus);
  if (focus.length > 0) return focus;
  const longest = wordIndices(tokens).reduce((best, i) => (tokens[i].text.length > tokens[best].text.length ? i : best));
  return [longest];
}

/** Token indices to hide, in sentence order. Higher steps hide more of the sentence. */
export function chooseBlanks(tokens: Token[], step: BlankStep): number[] {
  const focus = focusIndices(tokens);
  const others = shuffle(wordIndices(tokens).filter(i => !focus.includes(i)));

  let extra: number[] = [];
  if (step === 2) {
    extra = others.filter(i => tokens[i].text.length >= 3).slice(0, EXTRA_BLANKS_AT_STEP_2);
  } else if (step === 3) {
    const half = Math.ceil(wordIndices(tokens).length / 2);
    extra = others.slice(0, Math.max(0, half - focus.length));
  }
  return [...focus, ...extra].sort((a, b) => a - b);
}

/** A plausible wrong spelling of a word, or undefined if none would be believable. */
export function misspell(word: string, focus: string): string | undefined {
  if (word.length > 3 && SILENT_ENDINGS.test(word)) return word.slice(0, -1);
  const alternative = SOUND_ALTERNATIVES[focus.toLowerCase()];
  if (alternative && word.toLowerCase().includes(focus.toLowerCase())) {
    return word.replace(new RegExp(focus, 'i'), alternative);
  }
  return undefined;
}

export function buildWordBank(tokens: Token[], blanks: number[], focus: string): BankWord[] {
  const answers = blanks.map(i => ({ id: `answer-${i}`, text: tokens[i].text }));
  const traps = blanks
    .filter(i => tokens[i].focus)
    .map(i => ({ id: `trap-${i}`, text: misspell(tokens[i].text, focus) }))
    .filter((trap): trap is BankWord => trap.text !== undefined && trap.text !== '');
  return shuffle([...answers, ...traps]);
}
