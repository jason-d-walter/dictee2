import { useRef, useState } from 'react';
import { useSentencePlayer } from '../../hooks/useSentencePlayer';
import { GradeResult, gradeSentence } from '../../utils/grading';
import { sentenceWords } from '../../utils/sentence';
import { LevelProps } from './types';
import AccentKeyboard from '../common/AccentKeyboard';
import SentenceText from '../sentence/SentenceText';
import PlayerBar from '../sentence/PlayerBar';
import GradedSentence from '../sentence/GradedSentence';

const BUTTON = 'font-bold text-xl px-5 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform';

/** Level 3: hear the sentence and write it all by yourself. */
export default function Dictee({ sentence, focus, rate, onDone }: LevelProps) {
  const player = useSentencePlayer(sentence, rate);
  const [answer, setAnswer] = useState('');
  const [group, setGroup] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const playGroup = (index: number) => {
    setGroup(index);
    player.playSegment(index);
  };

  const insertAtCursor = (char: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? answer.length;
    const end = input?.selectionEnd ?? answer.length;
    setAnswer(answer.slice(0, start) + char + answer.slice(end));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const check = () => {
    player.stop();
    setResult(gradeSentence(sentenceWords(sentence), answer));
  };

  if (result) {
    return (
      <>
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full flex flex-col gap-6">
          <ScoreBanner score={result.score} />
          <GradedSentence result={result} />
          <hr className="border-slate-200" />
          <SentenceText tokens={sentence.tokens} focus={focus} activeWord={player.activeWord} showFocus onWordTap={player.playWord} />
        </div>
        <PlayerBar playing={player.playing} onPlayAll={player.playAll} onStop={player.stop} />
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => setResult(null)} className={`${BUTTON} bg-white text-purple-700`}>
            ✏️ Corriger
          </button>
          <button onClick={() => onDone(result.score)} className={`${BUTTON} bg-gradient-to-r from-green-400 to-emerald-500 text-white`}>
            Phrase suivante →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-center items-center gap-3">
        <button onClick={player.playing ? player.stop : player.playAll} className={`${BUTTON} bg-gradient-to-r from-sky to-blue-500 text-white`}>
          {player.playing ? '⏹ Stop' : '🔊 Toute la phrase'}
        </button>
        <div className="flex items-center bg-white/20 rounded-2xl p-1 gap-1">
          <button onClick={() => playGroup(Math.max(0, group - 1))} disabled={group === 0} className={`${BUTTON} text-white disabled:opacity-30 shadow-none`}>
            ◀
          </button>
          <button onClick={() => playGroup(group)} className={`${BUTTON} bg-gradient-to-r from-lavender to-purple-500 text-white`}>
            🧩 Groupe {group + 1} / {player.segmentCount}
          </button>
          <button
            onClick={() => playGroup(Math.min(player.segmentCount - 1, group + 1))}
            disabled={group === player.segmentCount - 1}
            className={`${BUTTON} text-white disabled:opacity-30 shadow-none`}
          >
            ▶
          </button>
        </div>
      </div>

      <textarea
        ref={inputRef}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Écris la phrase ici…"
        rows={3}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-white rounded-3xl shadow-2xl p-6 text-3xl font-bold text-slate-800 border-4 border-purple-300 focus:border-purple-500 focus:outline-none resize-none"
      />

      <AccentKeyboard onCharacter={insertAtCursor} />

      <button
        onClick={check}
        disabled={answer.trim() === ''}
        className={`${BUTTON} text-2xl px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white disabled:opacity-50`}
      >
        ✔ J'ai fini !
      </button>
    </>
  );
}

function ScoreBanner({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  const [emoji, message] = score === 1 ? ['🏆', 'Parfait !'] : score >= 0.8 ? ['🎉', 'Presque parfait !'] : ['💪', 'Continue !'];
  return (
    <div className="text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="text-3xl font-bold text-purple-700 mt-2">{message}</p>
      <p className="text-slate-500 text-xl">{percent} %</p>
    </div>
  );
}
