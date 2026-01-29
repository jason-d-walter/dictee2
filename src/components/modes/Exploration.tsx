import { useState } from 'react';
import { Word } from '../../types';
import { useSpeech } from '../../hooks/useSpeech';
import StarCounter from '../common/StarCounter';

interface ExplorationProps {
  word: Word;
  allWords: Word[];
  stars: number;
  currentIndex: number;
  totalWords: number;
  onComplete: (correct: boolean) => void;
  onBack: () => void;
}

export default function Exploration({
  word,
  stars,
  currentIndex,
  totalWords,
  onComplete,
  onBack,
}: ExplorationProps) {
  const { speak, speakAudio, speaking } = useSpeech();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const playWord = () => {
    if (word.audioWord) {
      speakAudio(word.audioWord);
    } else {
      speak(word.text);
    }
  };

  const playSentence = () => {
    if (word.audioSentence) {
      speakAudio(word.audioSentence);
    } else if (word.sentence) {
      speak(word.sentence);
    }
  };

  const handleNext = () => {
    onComplete(true); // Always "correct" in exploration mode
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            🔍 Exploration
          </h2>
        </div>

        {/* Word card */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full">
          {/* The word */}
          <div className="text-center mb-4">
            <button
              onClick={playWord}
              disabled={speaking}
              className="text-4xl md:text-5xl font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {word.text}
              <span className="ml-3 text-3xl">{speaking ? '🔊' : '🔈'}</span>
            </button>
          </div>

          {/* Image */}
          {word.image && !imageError && (
            <div className="relative mb-4 rounded-2xl overflow-hidden bg-orange-100">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl animate-pulse">🖼️</span>
                </div>
              )}
              <img
                src={word.image}
                alt={word.text}
                className={`w-full h-48 object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Sentence */}
          {word.sentence && (
            <div className="bg-orange-50 rounded-2xl p-4">
              <button
                onClick={playSentence}
                disabled={speaking}
                className="w-full text-left"
              >
                <p className="text-lg md:text-xl text-orange-800 italic">
                  "{word.sentence}"
                </p>
                <p className="text-orange-500 text-sm mt-2">
                  {speaking ? '🔊 Lecture...' : '🔈 Tap to listen'}
                </p>
              </button>
            </div>
          )}

          {/* No content fallback */}
          {!word.sentence && !word.image && (
            <p className="text-center text-orange-400 italic">
              Générez les ressources avec le script Python pour voir plus de contenu!
            </p>
          )}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="px-12 py-4 text-2xl font-bold bg-white text-orange-600 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          {currentIndex < totalWords - 1 ? 'Suivant →' : 'Terminer ✓'}
        </button>
      </div>
    </div>
  );
}
