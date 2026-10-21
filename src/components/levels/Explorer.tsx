import { useMemo, useState } from 'react';
import { useSentencePlayer } from '../../hooks/useSentencePlayer';
import { segmentText } from '../../utils/sentence';
import { shuffle } from '../../utils/text';
import { LevelProps } from './types';
import SentenceText from '../sentence/SentenceText';
import PlayerBar from '../sentence/PlayerBar';

type Phase = 'listen' | 'order' | 'done';

const CARD = 'bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full';
const TOGGLE = 'px-4 py-2 rounded-xl font-bold text-lg transition-all';

/** Level 1: listen, explore the words and sound, then rebuild the sentence from its groups. */
export default function Explorer({ sentence, focus, rate, onDone }: LevelProps) {
  const player = useSentencePlayer(sentence, rate);
  const [showFocus, setShowFocus] = useState(true);
  const [showGroups, setShowGroups] = useState(false);
  const [phase, setPhase] = useState<Phase>('listen');
  const groups = useMemo(
    () => Array.from({ length: player.segmentCount }, (_, i) => segmentText(sentence, i)),
    [sentence, player.segmentCount],
  );

  const startOrdering = () => {
    player.stop();
    setPhase(player.segmentCount > 1 ? 'order' : 'done');
  };

  return (
    <>
      <div className={CARD}>
        {phase === 'order' ? (
          <GroupOrdering
            groups={groups}
            onPlayGroup={player.playSegment}
            onComplete={() => {
              setPhase('done');
              player.playAll();
            }}
          />
        ) : (
          <SentenceText
            tokens={sentence.tokens}
            focus={focus}
            activeWord={player.activeWord}
            showFocus={showFocus}
            showGroups={showGroups}
            onWordTap={player.playWord}
          />
        )}
      </div>

      {phase !== 'order' && (
        <>
          <PlayerBar playing={player.playing} onPlayAll={player.playAll} onPlayGroups={player.playInGroups} onStop={player.stop} />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowFocus(v => !v)}
              className={`${TOGGLE} ${showFocus ? 'bg-orange-400 text-white' : 'bg-white/30 text-white'}`}
            >
              🟠 Le son « {focus} »
            </button>
            <button
              onClick={() => setShowGroups(v => !v)}
              className={`${TOGGLE} ${showGroups ? 'bg-sky text-white' : 'bg-white/30 text-white'}`}
            >
              🧱 Les groupes de mots
            </button>
          </div>
          <p className="text-white/80 text-center">👆 Touche un mot pour l'entendre.</p>
        </>
      )}

      {phase === 'listen' && (
        <button onClick={startOrdering} className="bg-white text-purple-700 font-bold text-2xl px-8 py-4 rounded-2xl shadow-lg active:scale-95">
          Je suis prêt·e ! →
        </button>
      )}
      {phase === 'done' && (
        <button onClick={() => onDone(1)} className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-2xl px-8 py-4 rounded-2xl shadow-lg active:scale-95">
          ⭐ Phrase suivante →
        </button>
      )}
    </>
  );
}

interface GroupOrderingProps {
  groups: string[];
  onPlayGroup: (segment: number) => void;
  onComplete: () => void;
}

function GroupOrdering({ groups, onPlayGroup, onComplete }: GroupOrderingProps) {
  const shuffled = useMemo(() => shuffle(groups.map((text, segment) => ({ text, segment }))), [groups]);
  const [placed, setPlaced] = useState(0);
  const [shaking, setShaking] = useState<number | null>(null);

  const tryGroup = (segment: number) => {
    onPlayGroup(segment);
    if (segment !== placed) {
      setShaking(segment);
      setTimeout(() => setShaking(null), 500);
      return;
    }
    const next = placed + 1;
    setPlaced(next);
    if (next === groups.length) onComplete();
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xl text-slate-500 text-center">Remets les groupes de mots dans l'ordre.</p>
      <p className="text-3xl md:text-4xl font-bold text-slate-800 text-center min-h-[3rem]">
        {groups.slice(0, placed).join(' ')}
        {placed < groups.length && <span className="text-slate-300"> …</span>}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {shuffled
          .filter(group => group.segment >= placed)
          .map(group => (
            <button
              key={group.segment}
              onClick={() => tryGroup(group.segment)}
              className={`bg-gradient-to-r from-lavender to-purple-500 text-white text-2xl font-bold px-5 py-3 rounded-2xl shadow-lg active:scale-95 ${
                shaking === group.segment ? 'animate-shake' : ''
              }`}
            >
              {group.text}
            </button>
          ))}
      </div>
    </div>
  );
}
