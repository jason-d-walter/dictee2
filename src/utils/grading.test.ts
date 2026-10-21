import { describe, expect, it } from 'vitest';
import { gradeSentence } from './grading';

const expected = ['Parfois', 'ils', "n'ont", 'pas', 'le', 'droit'];

const statuses = (typed: string) => gradeSentence(expected, typed).words.map(w => w.status);

describe('gradeSentence', () => {
  it('marks a perfect answer correct with full score', () => {
    const result = gradeSentence(expected, "Parfois, ils n'ont pas le droit.");
    expect(result.words.every(w => w.status === 'correct')).toBe(true);
    expect(result.score).toBe(1);
  });

  it('treats the curly apostrophe from the iPad keyboard as a plain one', () => {
    expect(statuses('Parfois ils n’ont pas le droit')).toEqual(Array(6).fill('correct'));
  });

  it('marks missing accents or capitals as almost', () => {
    const result = gradeSentence(['Il', 'est', 'tombé'], 'il est tombe');
    expect(result.words.map(w => w.status)).toEqual(['almost', 'correct', 'almost']);
    expect(result.words[2].typed).toBe('tombe');
  });

  it('marks misspellings wrong and keeps what she typed', () => {
    const result = gradeSentence(expected, "Parfois ils n'ont pas le droa");
    expect(result.words[5]).toEqual({ expected: 'droit', typed: 'droa', status: 'wrong' });
  });

  it('marks skipped words missing without shifting the rest', () => {
    expect(statuses("Parfois n'ont pas le droit")).toEqual([
      'correct', 'missing', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('reports extra words', () => {
    const result = gradeSentence(['le', 'toit'], 'le le toit');
    expect(result.words.map(w => w.status)).toEqual(['correct', 'correct']);
    expect(result.extra).toEqual(['le']);
  });

  it('gives half credit for almost words', () => {
    expect(gradeSentence(['un', 'oiseau'], 'un oiséau').score).toBe(0.75);
  });

  it('scores an empty answer as zero', () => {
    expect(gradeSentence(expected, '   ').score).toBe(0);
  });
});
