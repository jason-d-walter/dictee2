import { useState, useEffect } from 'react';
import { GameMode, GameSession, SupportedLanguage } from './types';
import { useWordList } from './hooks/useWordList';
import { useProgress } from './hooks/useProgress';
import { useMetadata } from './hooks/useMetadata';
import { LanguageProvider } from './i18n/LanguageContext';
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
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('fr');
  const { weeks, selectedWeek, selectWeek, loading: metadataLoading } = useMetadata();
  const weekPath = selectedWeek ? (selectedWeek.path ?? selectedWeek.sounds) : undefined;
  const { words, loading: wordsLoading, error, refetch } = useWordList(weekPath);
  const { progress, recordAttempt, getWordsForPractice } = useProgress();

  const filteredWeeks = weeks.filter(w => (w.language ?? 'fr') === selectedLanguage);

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    const firstWeek = weeks.find(w => (w.language ?? 'fr') === lang);
    if (firstWeek) {
      selectWeek(firstWeek);
    }
  };

  const language: SupportedLanguage = selectedWeek?.language ?? 'fr';

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const loading = metadataLoading || wordsLoading;

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

  // Determine content to render
  let content: React.ReactNode;

  if (showWordList) {
    content = (
      <WordListView
        words={words}
        progress={progress}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onClose={() => setShowWordList(false)}
      />
    );
  } else if (session?.completed) {
    content = (
      <GameSummary
        stars={session.stars}
        totalWords={session.words.length}
        results={session.results}
        words={session.words}
        onPlayAgain={handlePlayAgain}
        onBackToMenu={handleBackToMenu}
      />
    );
  } else if (session && !session.completed) {
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
        content = <AudioMatch {...gameProps} />;
        break;
      case 'lettres-perdues':
        content = <LettresPerdues {...gameProps} />;
        break;
      case 'dictee-fantome':
        content = <DicteeFantome {...gameProps} />;
        break;
      case 'exploration':
        content = <Exploration {...gameProps} />;
        break;
    }
  } else {
    content = (
      <ModeSelector
        onSelectMode={startGame}
        onOpenWordList={() => setShowWordList(true)}
        hasWords={words.length > 0}
        loading={loading}
        error={error}
        progress={progress}
        words={words}
        weeks={filteredWeeks}
        selectedWeek={selectedWeek}
        onSelectWeek={selectWeek}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />
    );
  }

  return (
    <LanguageProvider language={language}>
      {content}
    </LanguageProvider>
  );
}

export default App;
