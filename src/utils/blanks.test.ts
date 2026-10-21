import { describe, expect, it } from 'vitest';
import { Token } from '../types';
import { buildWordBank, chooseBlanks, misspell } from './blanks';

function tokensOf(words: string[], focusWords: string[] = []): Token[] {
  return words.map(text => ({ text, space: true, segment: 0, word: true, focus: focusWords.includes(text) || undefined }));
}

const tokens = tokensOf(
  ['Parfois', 'ils', "n'ont", 'pas', 'le', 'droit', 'de', 'se', 'promener', 'car', 'ils', 'ont', 'froid'],
  ['Parfois', 'droit', 'froid'],
);
const textAt = (indices: number[]) => indices.map(i => tokens[i].text);

describe('chooseBlanks', () => {
  it('step 1 blanks only the focus-sound words', () => {
    expect(textAt(chooseBlanks(tokens, 1))).toEqual(['Parfois', 'droit', 'froid']);
  });

  it('step 2 adds two more words of three letters or more', () => {
    const blanks = chooseBlanks(tokens, 2);
    expect(blanks).toHaveLength(5);
    expect(textAt(blanks)).toEqual(expect.arrayContaining(['Parfois', 'droit', 'froid']));
    expect(textAt(blanks).every(w => w.length >= 3)).toBe(true);
  });

  it('step 3 blanks half the sentence, focus words included', () => {
    const blanks = chooseBlanks(tokens, 3);
    expect(blanks).toHaveLength(7);
    expect(textAt(blanks)).toEqual(expect.arrayContaining(['Parfois', 'droit', 'froid']));
  });

  it('returns indices in sentence order and never blanks punctuation', () => {
    const withComma: Token[] = [...tokens.slice(0, 1), { text: ',', space: true, segment: 0 }, ...tokens.slice(1)];
    const blanks = chooseBlanks(withComma, 3);
    expect(blanks).toEqual([...blanks].sort((a, b) => a - b));
    expect(blanks).not.toContain(1);
  });

  it('falls back to the longest word when nothing has the focus sound', () => {
    const plain = tokensOf(['le', 'chat', 'dort']);
    expect(chooseBlanks(plain, 1).map(i => plain[i].text)).toEqual(['chat']);
  });
});

describe('misspell', () => {
  it('drops a silent final consonant, the classic trap', () => {
    expect(misspell('toit', 'oi')).toBe('toi');
    expect(misspell('froid', 'oi')).toBe('froi');
  });

  it('swaps the focus sound when there is no silent letter', () => {
    expect(misspell('oiseau', 'oi')).toBe('oaseau');
  });

  it('returns nothing when it cannot make a believable trap', () => {
    expect(misspell('le', 'oi')).toBeUndefined();
  });
});

describe('buildWordBank', () => {
  it('holds every blanked word plus a trap for each focus word', () => {
    const blanks = chooseBlanks(tokens, 1);
    const bank = buildWordBank(tokens, blanks, 'oi').map(item => item.text);
    expect(bank).toHaveLength(6);
    expect(bank).toEqual(expect.arrayContaining(['Parfois', 'droit', 'froid', 'Parfoi', 'droi', 'froi']));
  });

  it('gives every chip a unique id even when words repeat', () => {
    const repeated = tokensOf(['ils', 'ont', 'ils']);
    const ids = buildWordBank(repeated, [0, 2], 'oi').map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
