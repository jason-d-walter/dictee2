import { Sentence, SentenceResult } from '../../types';
import ConfettiCelebration from '../common/ConfettiCelebration';

interface SummaryProps {
  results: SentenceResult[];
  sentences: Sentence[];
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

function scoreStyle(score: number): string {
  if (score === 1) return 'bg-green-100 text-green-700';
  if (score >= 0.5) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export default function Summary({ results, sentences, onPlayAgain, onBackToMenu }: SummaryProps) {
  const stars = results.filter(r => r.score === 1).length;
  const isPerfect = stars === results.length;
  const textOf = (id: string) => sentences.find(s => s.id === id)?.text ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 p-4 flex flex-col items-center justify-center">
      <ConfettiCelebration trigger={isPerfect} />

      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-xl w-full text-center">
        <span className="text-6xl">{isPerfect ? '🏆' : '🎉'}</span>
        <h1 className="text-3xl font-bold text-orange-600 mt-4 mb-6">{isPerfect ? 'Parfait !' : 'Bon travail !'}</h1>

        <div className="flex items-center justify-center gap-2 text-4xl font-bold text-yellow-700 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-4 mb-6">
          <span>⭐</span>
          <span>{stars}</span>
          <span className="text-2xl text-yellow-500">/ {results.length}</span>
        </div>

        <div className="space-y-2 mb-6 text-left">
          {results.map(result => (
            <div key={result.sentenceId} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${scoreStyle(result.score)}`}>
              <span className="flex-1">{textOf(result.sentenceId)}</span>
              <span className="font-bold">{Math.round(result.score * 100)} %</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button onClick={onPlayAgain} className="w-full py-4 text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl shadow-lg active:scale-95">
            🔄 Recommencer
          </button>
          <button onClick={onBackToMenu} className="w-full py-4 text-xl font-bold bg-slate-200 text-slate-700 rounded-2xl active:scale-95">
            🏠 Menu
          </button>
        </div>
      </div>
    </div>
  );
}
