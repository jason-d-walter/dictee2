import { Word, WordResult } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfettiCelebration from '../common/ConfettiCelebration';

interface GameSummaryProps {
  stars: number;
  totalWords: number;
  results: WordResult[];
  words: Word[];
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function GameSummary({
  stars,
  totalWords,
  results,
  words,
  onPlayAgain,
  onBackToMenu,
}: GameSummaryProps) {
  const { translations: tr } = useLanguage();
  const percentage = Math.round((stars / totalWords) * 100);
  const isPerfect = stars === totalWords;

  // Get word text by ID
  const getWordText = (wordId: string) => {
    return words.find(w => w.id === wordId)?.text || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 p-4 flex flex-col items-center justify-center">
      <ConfettiCelebration trigger={isPerfect} />

      {/* Main card */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-6">
          {isPerfect ? (
            <>
              <span className="text-6xl">🏆</span>
              <h1 className="text-3xl font-bold text-yellow-600 mt-4">
                {tr.perfect}
              </h1>
            </>
          ) : percentage >= 70 ? (
            <>
              <span className="text-6xl">🎉</span>
              <h1 className="text-3xl font-bold text-orange-600 mt-4">
                {tr.greatJob}
              </h1>
            </>
          ) : (
            <>
              <span className="text-6xl">💪</span>
              <h1 className="text-3xl font-bold text-purple-600 mt-4">
                {tr.keepGoing}
              </h1>
            </>
          )}
        </div>

        {/* Score */}
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 text-4xl font-bold text-yellow-700">
            <span>⭐</span>
            <span>{stars}</span>
            <span className="text-2xl text-yellow-500">/ {totalWords}</span>
          </div>
          <p className="text-yellow-600 mt-2">{tr.percentCorrect(percentage)}</p>
        </div>

        {/* Results list */}
        <div className="text-left mb-6">
          <h3 className="font-bold text-slate-600 mb-3">{tr.results}</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`
                  flex items-center justify-between
                  px-4 py-2 rounded-xl
                  ${result.correct ? 'bg-green-100' : 'bg-red-100'}
                `}
              >
                <span className={result.correct ? 'text-green-700' : 'text-red-700'}>
                  {getWordText(result.wordId)}
                </span>
                <span>{result.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-4 text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl shadow-lg hover:scale-105 transition-transform"
          >
            🔄 {tr.playAgain}
          </button>
          <button
            onClick={onBackToMenu}
            className="w-full py-4 text-xl font-bold bg-slate-200 text-slate-700 rounded-2xl hover:bg-slate-300 transition-colors"
          >
            🏠 {tr.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
