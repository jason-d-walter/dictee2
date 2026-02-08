import { useState } from 'react';
import { GameMode, GameSession } from './types';
import { useWordList } from './hooks/useWordList';
import { useProgress } from './hooks/useProgress';
import { useMetadata } from './hooks/useMetadata';
import ModeSelector from './components/layout/ModeSelector';
import GameSummary from './components/layout/GameSummary';
import AudioMatch from './components/modes/AudioMatch';
import LettresPerdues from './components/modes/LettresPerdues';
import DicteeFantome from './components/modes/DicteeFantome';
import Exploration from './components/modes/Exploration';
import WordListView from './components/admin/WordListView';

const SESSION_SIZE = 10;

function App() {
  const [showWordList, setShowWordList] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const { words, loading, error, refetch } = useWordList();
  const { progress, recordAttempt, getWordsForPractice } = useProgress();
  const metadata = useMetadata();

  const startGame = (mode: GameMode) => {
    const practiceWords = getWordsForPractice(words, SESSION_SIZE);
    if (practiceWords.length === 0) return;

    setSession({
      mode,
      words: practiceWords,
      currentIndex: 0,
      stars: 0,
      completed: false,
      results: [],
    });
  };

  const handleWordComplete = (correct: boolean) => {
    if (!session) return;

    const currentWord = session.words[session.currentIndex];

    // Don't record progress for exploration mode
    if (session.mode !== 'exploration') {
      recordAttempt(currentWord.id, correct);
    }

    const newResults = [...session.results, { wordId: currentWord.id, correct, attempts: 1 }];
    const newStars = correct ? session.stars + 1 : session.stars;
    const nextIndex = session.currentIndex + 1;
    const completed = nextIndex >= session.words.length;

    setSession({
      ...session,
      currentIndex: nextIndex,
      stars: newStars,
      completed,
      results: newResults,
    });
  };

  const handlePlayAgain = () => {
    setSession(null);
  };

  const handleBackToMenu = () => {
    setSession(null);
  };

  // Word list view
  if (showWordList) {
    return (
      <WordListView
        words={words}
        progress={progress}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onClose={() => setShowWordList(false)}
      />
    );
  }

  // Game summary view
  if (session?.completed) {
    return (
      <GameSummary
        stars={session.stars}
        totalWords={session.words.length}
        results={session.results}
        words={session.words}
        onPlayAgain={handlePlayAgain}
        onBackToMenu={handleBackToMenu}
      />
    );
  }

  // Active game view
  if (session && !session.completed) {
    const currentWord = session.words[session.currentIndex];
    const allWords = session.words;

    const gameProps = {
      word: currentWord,
      allWords,
      stars: session.stars,
      currentIndex: session.currentIndex,
      totalWords: session.words.length,
      onComplete: handleWordComplete,
      onBack: handleBackToMenu,
    };

    switch (session.mode) {
      case 'audio-match':
        return <AudioMatch {...gameProps} />;
      case 'lettres-perdues':
        return <LettresPerdues {...gameProps} />;
      case 'dictee-fantome':
        return <DicteeFantome {...gameProps} />;
      case 'exploration':
        return <Exploration {...gameProps} />;
    }
  }

  // Mode selector view
  return (
    <ModeSelector
      onSelectMode={startGame}
      onOpenWordList={() => setShowWordList(true)}
      hasWords={words.length > 0}
      loading={loading}
      error={error}
      progress={progress}
      words={words}
      metadata={metadata}
    />
  );
}

export default App;
