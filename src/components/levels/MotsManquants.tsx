import { useMemo, useState } from 'react';
import { BlankStep } from '../../types';
import { useSentencePlayer } from '../../hooks/useSentencePlayer';
import { BankWord, buildWordBank, chooseBlanks } from '../../utils/blanks';
import { normalizeQuotes } from '../../utils/text';
import { LevelProps } from './types';
import SentenceText from '../sentence/SentenceText';
import PlayerBar from '../sentence/PlayerBar';

const WRONG_FEEDBACK_MS = 1200;

type Verdict = Record<number, boolean>;

/** Level 2: put the missing words back where they belong. */
export default function MotsManquants({ sentence, focus, rate, onDone, step }: LevelProps & { step: BlankStep }) {
  const player = useSentencePlayer(sentence, rate);
  const blanks = useMemo(() => chooseBlanks(sentence.tokens, step), [sentence, step]);
  const bank = useMemo(() => buildWordBank(sentence.tokens, blanks, focus), [sentence, blanks, focus]);
  const [placements, setPlacements] = useState<Record<number, BankWord>>({});
  const [selected, setSelected] = useState(blanks[0]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [mistakes, setMistakes] = useState(false);

  const solved = verdict !== null && blanks.every(i => verdict[i]);
  const allFilled = blanks.every(i => placements[i]);
  const usedIds = new Set(Object.values(placements).map(w => w.id));
  const firstEmpty = (filled: Record<number, BankWord>) => blanks.find(i => !filled[i]);

  const placeWord = (word: BankWord) => {
    if (verdict) return;
    const target = placements[selected] ? firstEmpty(placements) : selected;
    if (target === undefined) return;
    const next = { ...placements, [target]: word };
    setPlacements(next);
    setSelected(firstEmpty(next) ?? target);
  };

  const tapSlot = (tokenIndex: number) => {
    if (verdict) return;
    if (placements[tokenIndex]) {
      const { [tokenIndex]: _removed, ...rest } = placements;
      setPlacements(rest);
    }
    setSelected(tokenIndex);
  };

  const check = () => {
    const result: Verdict = Object.fromEntries(
      blanks.map(i => [i, normalizeQuotes(placements[i].text) === normalizeQuotes(sentence.tokens[i].text)]),
    );
    setVerdict(result);
    if (blanks.every(i => result[i])) {
      player.playAll();
      return;
    }
    setMistakes(true);
    setTimeout(() => {
      const kept = Object.fromEntries(Object.entries(placements).filter(([i]) => result[Number(i)]));
      setPlacements(kept);
      setSelected(firstEmpty(kept) ?? blanks[0]);
      setVerdict(null);
    }, WRONG_FEEDBACK_MS);
  };

  const renderSlot = (tokenIndex: number) => {
    if (!blanks.includes(tokenIndex)) return undefined;
    const word = placements[tokenIndex];
    const state = verdict ? (verdict[tokenIndex] ? 'right' : 'wrong') : tokenIndex === selected ? 'selected' : 'idle';
    const styles = {
      right: 'bg-green-100 border-green-500 text-green-700',
      wrong: 'bg-red-100 border-red-500 text-red-700 animate-shake',
      selected: 'bg-yellow-50 border-sunshine ring-4 ring-sunshine/50',
      idle: 'bg-slate-50 border-slate-300',
    }[state];
    return (
      <button
        onClick={() => tapSlot(tokenIndex)}
        className={`inline-block min-w-[4em] px-2 rounded-xl border-4 border-dashed align-middle leading-snug ${styles}`}
      >
        {word?.text ?? ' '}
      </button>
    );
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full">
        <SentenceText tokens={sentence.tokens} focus={focus} activeWord={player.activeWord} renderWord={renderSlot} />
      </div>

      <PlayerBar playing={player.playing} onPlayAll={player.playAll} onPlayGroups={player.playInGroups} onStop={player.stop} />

      {!solved && (
        <div className="flex flex-wrap justify-center gap-3">
          {bank.map(word => (
            <button
              key={word.id}
              onClick={() => placeWord(word)}
              disabled={usedIds.has(word.id)}
              className="bg-white text-purple-700 text-2xl font-bold px-5 py-3 rounded-2xl shadow-lg border-4 border-purple-300 active:scale-95 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >
              {word.text}
            </button>
          ))}
        </div>
      )}

      {allFilled && !verdict && (
        <button onClick={check} className="bg-gradient-to-r from-sky to-blue-500 text-white font-bold text-2xl px-8 py-4 rounded-2xl shadow-lg active:scale-95">
          ✔ Vérifier
        </button>
      )}
      {solved && (
        <button
          onClick={() => onDone(mistakes ? 0.5 : 1)}
          className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-2xl px-8 py-4 rounded-2xl shadow-lg active:scale-95"
        >
          {mistakes ? '👍 Bravo !' : '⭐ Parfait !'} Phrase suivante →
        </button>
      )}
    </>
  );
}
