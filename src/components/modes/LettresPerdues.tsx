import { useState, useEffect } from 'react';
import { Word, SupportedLanguage } from '../../types';
import { useSpeech } from '../../hooks/useSpeech';
import { useLanguage } from '../../i18n/LanguageContext';
import { generateMissingLetters, shuffleArray } from '../../utils/wordUtils';
import StarCounter from '../common/StarCounter';
import SpeakButton from '../common/SpeakButton';

// Common letters to use as distractors, keyed by language
const DISTRACTOR_LETTERS: Record<SupportedLanguage, string[]> = {
  fr: ['a', 'e', 'i', 'o', 'u', 'n', 's', 't', 'r', 'l', 'c', 'm', 'p', 'd'],
  en: ['a', 'e', 'i', 'o', 'u', 'n', 's', 't', 'r', 'l', 'c', 'm', 'p', 'd'],
};

interface LettresPerduesProps {
  word: Word;
  allWords: Word[];
  stars: number;
  currentIndex: number;
  totalWords: number;
  onComplete: (correct: boolean) => void;
  onBack: () => void;
}

interface LetterSlot {
  index: number;
  letter: string | null;
}

export default function LettresPerdues({
  word,
  stars,
  currentIndex,
  totalWords,
  onComplete,
  onBack,
}: LettresPerduesProps) {
  const { language, translations: tr } = useLanguage();
  const { speak, speakAudio } = useSpeech(language);
  const [puzzle, setPuzzle] = useState<ReturnType<typeof generateMissingLetters> | null>(null);
  const [slots, setSlots] = useState<LetterSlot[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const playWord = () => {
    if (word.audioWord) {
      speakAudio(word.audioWord);
    } else {
      speak(word.text);
    }
  };

  useEffect(() => {
    const numMissing = word.text.length > 4 ? 2 : 1;
    const generated = generateMissingLetters(word.text, numMissing, language);
    setPuzzle(generated);

    // Initialize empty slots
    setSlots(generated.missingIndices.map(index => ({ index, letter: null })));

    // Create letter bank with at least 3 letters (correct ones + distractors)
    const correctLetters = [...generated.missingLetters];
    const minLetters = 3;
    const neededDistractors = Math.max(0, minLetters - correctLetters.length);

    // Pick random distractors that aren't already in the correct letters
    const distractorPool = DISTRACTOR_LETTERS[language] ?? DISTRACTOR_LETTERS.fr;
    const availableDistractors = distractorPool.filter(
      l => !correctLetters.map(c => c.toLowerCase()).includes(l)
    );
    const distractors = shuffleArray(availableDistractors).slice(0, neededDistractors);

    // Combine and shuffle all letters
    setAvailableLetters(shuffleArray([...correctLetters, ...distractors]));

    setSelectedLetter(null);
    setShowResult(false);
    setIsCorrect(false);

    // Auto-play the word
    const timer = setTimeout(() => playWord(), 500);
    return () => clearTimeout(timer);
  }, [word, speak]);

  const handleLetterClick = (letterIndex: number) => {
    if (showResult) return;

    if (selectedLetter === letterIndex) {
      setSelectedLetter(null);
    } else {
      setSelectedLetter(letterIndex);
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    if (showResult || selectedLetter === null) return;

    const letter = availableLetters[selectedLetter];

    // Fill the slot
    setSlots(prev =>
      prev.map((slot, i) =>
        i === slotIndex ? { ...slot, letter } : slot
      )
    );

    // Remove from available
    setAvailableLetters(prev => prev.filter((_, i) => i !== selectedLetter));
    setSelectedLetter(null);
  };

  const handleSlotRemove = (slotIndex: number) => {
    if (showResult) return;

    const slot = slots[slotIndex];
    if (slot.letter) {
      // Put letter back in available pool
      setAvailableLetters(prev => [...prev, slot.letter!]);
      // Clear the slot
      setSlots(prev =>
        prev.map((s, i) =>
          i === slotIndex ? { ...s, letter: null } : s
        )
      );
    }
  };

  const allSlotsFilled = slots.every(slot => slot.letter !== null);

  const handleSubmit = () => {
    if (!allSlotsFilled || showResult) return;
    validateAnswer();
  };

  const validateAnswer = () => {
    if (!puzzle) return;

    // Reconstruct the word from display + filled slots
    const letters = puzzle.displayWord.split('');
    slots.forEach(slot => {
      if (slot.letter) {
        letters[slot.index] = slot.letter;
      }
    });

    const reconstructed = letters.join('');
    const correct = reconstructed.toLowerCase() === word.text.toLowerCase();

    setIsCorrect(correct);
    setShowResult(true);

    setTimeout(() => {
      onComplete(correct);
    }, 1500);
  };

  if (!puzzle) return null;

  const displayLetters = puzzle.displayWord.split('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-emerald-500 to-green-400 p-4 flex flex-col">
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
            🧩 {tr.lettresPerduesTitle}
          </h2>
          <p className="text-white/90 text-lg">
            {tr.lettresPerduesInstruction}
          </p>
        </div>

        {/* Speak button */}
        <SpeakButton word={word.text} audioPath={word.audioWord} size="medium" />

        {/* Word display with slots */}
        <div className="flex flex-wrap justify-center gap-2 p-4">
          {displayLetters.map((char, index) => {
            const slotIndex = slots.findIndex(s => s.index === index);
            const isSlot = slotIndex !== -1;
            const filledLetter = isSlot ? slots[slotIndex].letter : null;

            if (isSlot) {
              return (
                <div
                  key={index}
                  onClick={() => filledLetter ? handleSlotRemove(slotIndex) : handleSlotClick(slotIndex)}
                  className={`
                    w-14 h-16 md:w-16 md:h-20
                    flex items-center justify-center
                    text-3xl md:text-4xl font-bold
                    rounded-xl
                    border-4 border-dashed
                    transition-all duration-200
                    cursor-pointer
                    ${filledLetter
                      ? 'bg-white text-emerald-700 border-emerald-400 hover:border-red-400'
                      : 'bg-white/30 text-transparent border-white/60'}
                    ${selectedLetter !== null && !filledLetter ? 'scale-110 border-yellow-400' : ''}
                  `}
                >
                  {filledLetter || '_'}
                </div>
              );
            }

            return (
              <div
                key={index}
                className="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center text-3xl md:text-4xl font-bold text-white bg-white/20 rounded-xl"
              >
                {char}
              </div>
            );
          })}
        </div>

        {/* Available letters */}
        <div className="flex flex-wrap justify-center gap-3 p-4">
          {availableLetters.map((letter, index) => (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleLetterClick(index)}
              className={`
                w-16 h-16 md:w-20 md:h-20
                text-3xl md:text-4xl font-bold
                bg-yellow-400 text-yellow-900
                rounded-2xl shadow-lg
                transition-all duration-150
                ${selectedLetter === index ? 'scale-110 ring-4 ring-white' : 'hover:scale-105'}
                active:scale-95
              `}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Submit button */}
        {!showResult && (
          <button
            onClick={handleSubmit}
            disabled={!allSlotsFilled}
            className={`
              px-12 py-4
              text-2xl font-bold
              bg-gradient-to-r from-yellow-400 to-orange-400
              text-white
              rounded-full
              shadow-lg
              transition-all duration-200
              ${!allSlotsFilled
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
              <span className="text-4xl">🎉 {tr.feedbackPerfect}</span>
            ) : (
              <div className="text-center">
                <span className="text-4xl">😅 {tr.feedbackAlmost}</span>
                <p className="text-white text-xl mt-2">
                  {tr.correctAnswerWas(word.text)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
