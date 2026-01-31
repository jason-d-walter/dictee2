import { useState, useEffect } from 'react';
import { Word } from '../../types';
import { useSpeech } from '../../hooks/useSpeech';
import { getRandomWords, shuffleArray } from '../../utils/wordUtils';
import StarCounter from '../common/StarCounter';
import SpeakButton from '../common/SpeakButton';

interface AudioMatchProps {
  word: Word;
  allWords: Word[];
  stars: number;
  currentIndex: number;
  totalWords: number;
  onComplete: (correct: boolean) => void;
  onBack: () => void;
}

export default function AudioMatch({
  word,
  allWords,
  stars,
  currentIndex,
  totalWords,
  onComplete,
  onBack,
}: AudioMatchProps) {
  const { speak, speakAudio } = useSpeech();
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const playWord = () => {
    if (word.audioWord) {
      speakAudio(word.audioWord);
    } else {
      speak(word.text);
    }
  };

  useEffect(() => {
    // Generate 3 options: correct word + 2 random distractors
    const distractors = getRandomWords(allWords, 2, word.text);
    const allOptions = shuffleArray([word.text, ...distractors]);
    setOptions(allOptions);
    setSelected(null);
    setShowResult(false);

    // Auto-play the word
    const timer = setTimeout(() => playWord(), 500);
    return () => clearTimeout(timer);
  }, [word, allWords]);

  const handleSelect = (option: string) => {
    if (showResult) return;

    setSelected(option);
    setShowResult(true);

    const correct = option === word.text;

    // Play feedback and advance after delay
    setTimeout(() => {
      onComplete(correct);
    }, 1500);
  };

  const getButtonClass = (option: string) => {
    const baseClass = `
      w-full py-6 px-8
      text-2xl md:text-3xl font-bold
      rounded-3xl shadow-lg
      transition-all duration-300
      transform
    `;

    if (!showResult) {
      return `${baseClass} bg-white text-purple-700 hover:scale-105 active:scale-95`;
    }

    if (option === word.text) {
      return `${baseClass} bg-green-400 text-white scale-105 animate-pulse`;
    }

    if (option === selected && option !== word.text) {
      return `${baseClass} bg-red-400 text-white scale-95`;
    }

    return `${baseClass} bg-white/50 text-gray-400`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-white text-xl font-bold bg-white/20 rounded-full px-4 py-2"
        >
          ← Retour
        </button>
        <StarCounter stars={stars} total={totalWords} />
      </div>

      {/* Progress */}
      <div className="text-center mb-4">
        <span className="text-white/80 text-lg">
          Mot {currentIndex + 1} sur {totalWords}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Instructions */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            🎧 L'Audio-Match
          </h2>
          <p className="text-white/90 text-lg">
            Écoute le mot et tape sur la bonne réponse!
          </p>
        </div>

        {/* Speak button */}
        <SpeakButton word={word.text} audioPath={word.audioWord} size="large" />

        {/* Options */}
        <div className="w-full max-w-md space-y-4 px-4">
          {options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              onClick={() => handleSelect(option)}
              disabled={showResult}
              className={getButtonClass(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {showResult && (
          <div className="text-center">
            {selected === word.text ? (
              <span className="text-4xl">🎉 Bravo!</span>
            ) : (
              <span className="text-4xl">😅 Essaie encore!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
