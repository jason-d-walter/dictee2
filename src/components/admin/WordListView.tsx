import { Word, WordProgress } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface WordListViewProps {
  words: Word[];
  progress: Record<string, WordProgress>;
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onClose: () => void;
}

export default function WordListView({
  words,
  progress,
  loading,
  error,
  onRefetch,
  onClose,
}: WordListViewProps) {
  const { translations: tr } = useLanguage();
  const masteredCount = words.filter(w => progress[w.id]?.mastered).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">📚 {tr.wordListHeader}</h1>
          <button
            onClick={onClose}
            className="text-white bg-white/20 rounded-full px-4 py-2 font-bold"
          >
            {tr.back}
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white/20 rounded-2xl p-4 mb-6 text-center text-white">
          <span className="text-xl">
            {tr.wordListStats(words.length, masteredCount)}
          </span>
        </div>

        {/* Word list */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-xl">
          <h2 className="text-xl font-bold text-slate-700 mb-4">
            {tr.wordsOfTheWeek}
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-4xl animate-bounce">📖</div>
              <p className="text-slate-500 mt-2">{tr.loading}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-4xl">😕</div>
              <p className="text-red-500 mt-2">{error}</p>
              <button
                onClick={onRefetch}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-xl"
              >
                {tr.retry}
              </button>
            </div>
          ) : words.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              {tr.noWordsFound}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {words.map(word => {
                const wordProgress = progress[word.id];
                const isMastered = wordProgress?.mastered;

                return (
                  <div
                    key={word.id}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
                  >
                    <span className="text-lg font-medium">{word.text}</span>
                    {isMastered && (
                      <span className="text-green-500">⭐ {tr.mastered}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onRefetch}
            disabled={loading}
            className="w-full py-3 text-lg font-bold bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50"
          >
            🔄 {tr.refreshWords}
          </button>
        </div>

        <p className="text-white/60 text-sm text-center mt-4">
          {tr.wordListFooter}
        </p>
      </div>
    </div>
  );
}
