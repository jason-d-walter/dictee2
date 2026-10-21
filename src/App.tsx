import { useState } from 'react';
import { BlankStep, Level, SentenceResult } from './types';
import { useWeeks } from './hooks/useWeeks';
import { progressKey, useProgress } from './hooks/useProgress';
import { useSpeed } from './hooks/useSpeed';
import Home from './components/layout/Home';
import LevelScreen from './components/layout/LevelScreen';
import Summary from './components/layout/Summary';
import Explorer from './components/levels/Explorer';
import MotsManquants from './components/levels/MotsManquants';
import Dictee from './components/levels/Dictee';

interface Session {
  level: Level;
  step: BlankStep;
  index: number;
  results: SentenceResult[];
}

const LEVEL_SCREENS: Record<Level, { title: string; gradient: string }> = {
  explorer: { title: "🔍 J'explore", gradient: 'from-amber-400 via-orange-400 to-pink-500' },
  'mots-manquants': { title: '🧩 Les mots manquants', gradient: 'from-teal-400 via-emerald-500 to-cyan-600' },
  dictee: { title: '✏️ La dictée', gradient: 'from-indigo-500 via-purple-500 to-violet-600' },
};

function App() {
  const { weeks, selectedWeek, selectWeek, manifest, loading, error } = useWeeks();
  const { getProgress, markExplored, recordBlanks, recordDictee } = useProgress();
  const { rate, setRate } = useSpeed();
  const [session, setSession] = useState<Session | null>(null);

  const weekPath = selectedWeek?.path ?? '';
  const sentences = manifest?.sentences ?? [];

  const startLevel = (level: Level, step: BlankStep) => setSession({ level, step, index: 0, results: [] });

  if (!session || !manifest) {
    return (
      <Home
        weeks={weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={selectWeek}
        manifest={manifest}
        loading={loading}
        error={error}
        progressOf={id => getProgress(progressKey(weekPath, id))}
        onStart={startLevel}
      />
    );
  }

  if (session.index >= sentences.length) {
    return (
      <Summary
        results={session.results}
        sentences={sentences}
        onPlayAgain={() => startLevel(session.level, session.step)}
        onBackToMenu={() => setSession(null)}
      />
    );
  }

  const sentence = sentences[session.index];

  const handleDone = (score: number) => {
    const key = progressKey(weekPath, sentence.id);
    if (session.level === 'explorer') markExplored(key);
    if (session.level === 'mots-manquants' && score === 1) recordBlanks(key, session.step);
    if (session.level === 'dictee') recordDictee(key, score);
    setSession({ ...session, index: session.index + 1, results: [...session.results, { sentenceId: sentence.id, score }] });
  };

  const levelProps = { sentence, focus: manifest.focus, rate, onDone: handleDone };
  const screen = LEVEL_SCREENS[session.level];

  return (
    <LevelScreen
      title={screen.title}
      gradient={screen.gradient}
      sentenceNumber={session.index + 1}
      sentenceCount={sentences.length}
      day={sentence.day}
      stars={session.results.filter(r => r.score === 1).length}
      rate={rate}
      onRateChange={setRate}
      onBack={() => setSession(null)}
    >
      {session.level === 'explorer' && <Explorer key={sentence.id} {...levelProps} />}
      {session.level === 'mots-manquants' && <MotsManquants key={sentence.id} {...levelProps} step={session.step} />}
      {session.level === 'dictee' && <Dictee key={sentence.id} {...levelProps} />}
    </LevelScreen>
  );
}

export default App;
