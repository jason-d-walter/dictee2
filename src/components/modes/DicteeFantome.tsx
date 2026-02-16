import { useState, useEffect, useRef } from 'react';
import { Word } from '../../types';
import { useSpeech } from '../../hooks/useSpeech';
import { useLanguage } from '../../i18n/LanguageContext';
import { compareAnswers } from '../../utils/wordUtils';
import StarCounter from '../common/StarCounter';
import SpeakButton from '../common/SpeakButton';
import AccentKeyboard from '../common/AccentKeyboard';

interface DicteeFantomeProps {
  word: Word;
  allWords: Word[];
  stars: number;
  currentIndex: number;
  totalWords: number;
  onComplete: (correct: boolean) => void;
  onBack: () => void;
}

export default function DicteeFantome({
  word,
  stars,
  currentIndex,
  totalWords,
  onComplete,
  onBack,
}: DicteeFantomeProps) {
  const { language, translations: tr } = useLanguage();
  const { speak, speakAudio } = useSpeech(language);
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const playWord = () => {
    if (word.audioWord) {
      speakAudio(word.audioWord);
    } else {
      speak(word.text);
    }
  };

  useEffect(() => {
    setAnswer('');
    setShowResult(false);
    setIsCorrect(false);

    // Auto-play the word
    const timer = setTimeout(() => playWord(), 500);

    // Focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }

    return () => clearTimeout(timer);
  }, [word]);

  const handleAccentCharacter = (char: string) => {
    setAnswer(prev => prev + char);
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (showResult || answer.trim() === '') return;

    const correct = compareAnswers(answer, word.text);
    setIsCorrect(correct);
    setShowResult(true);

    setTimeout(() => {
      onComplete(correct);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-white text-xl font-bold bg-white/20 rounded-full px-4 py-2"
        >
          {tr.back}
        </button>
        <StarCounter stars={stars} total={totalWords} />
      </div>

      {/* Progress */}
      <div className="text-center mb-4">
        <span className="text-white/80 text-lg">
          {tr.wordNofM(currentIndex + 1, totalWords)}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Instructions */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            👻 {tr.dicteeFantomeTitle}
          </h2>
          <p className="text-white/90 text-lg">
            {tr.dicteeFantomeInstruction}
          </p>
        </div>

        {/* Speak button */}
        <SpeakButton word={word.text} audioPath={word.audioWord} size="large" />

        {/* Input area */}
        <form onSubmit={handleSubmit} className="w-full max-w-md px-4">
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showResult}
            placeholder={tr.placeholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`
              w-full
              text-3xl md:text-4xl text-center font-bold
              py-4 px-6
              rounded-2xl
              border-4
              outline-none
              transition-all duration-200
              ${showResult
                ? isCorrect
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-purple-300 text-purple-700 focus:border-yellow-400'
              }
            `}
          />
        </form>

        {/* Accent keyboard */}
        <div className="w-full max-w-lg">
          <AccentKeyboard
            onCharacter={handleAccentCharacter}
            disabled={showResult}
          />
        </div>

        {/* Submit button */}
        {!showResult && (
          <button
            onClick={() => handleSubmit()}
            disabled={answer.trim() === ''}
            className={`
              px-12 py-4
              text-2xl font-bold
              bg-gradient-to-r from-yellow-400 to-orange-400
              text-white
              rounded-full
              shadow-lg
              transition-all duration-200
              ${answer.trim() === ''
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
              }
            `}
          >
            {tr.verify}
          </button>
        )}

        {/* Feedback */}
        {showResult && (
          <div className="text-center">
            {isCorrect ? (
              <div>
                <span className="text-5xl">🎉</span>
                <p className="text-white text-2xl font-bold mt-2">{tr.feedbackBravo}</p>
              </div>
            ) : (
              <div>
                <span className="text-5xl">😅</span>
                <p className="text-white text-xl mt-2">
                  {tr.correctAnswerLabel}
                </p>
                <p className="text-yellow-300 text-3xl font-bold mt-1">
                  {word.text}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
