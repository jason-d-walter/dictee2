import { GameMode, Word, WordProgress, WeekEntry } from '../../types';

interface ModeSelectorProps {
  onSelectMode: (mode: GameMode) => void;
  onOpenWordList: () => void;
  hasWords: boolean;
  loading: boolean;
  error: string | null;
  progress: Record<string, WordProgress>;
  words: Word[];
  weeks: WeekEntry[];
  selectedWeek: WeekEntry | null;
  onSelectWeek: (week: WeekEntry) => void;
}

function formatWeekLabel(week: WeekEntry): string {
  const start = new Date(week.week_start + 'T00:00:00');
  const end = new Date(week.week_end + 'T00:00:00');
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = end.toLocaleDateString('fr-FR', { month: 'short' });
  return `${startDay}-${endDay} ${month} : \u00AB${week.sounds}\u00BB`;
}

const MODES: { id: GameMode; emoji: string; title: string; description: string; color: string }[] = [
  {
    id: 'exploration',
    emoji: '🔍',
    title: 'Exploration',
    description: 'Découvre les mots avec images et phrases!',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'audio-match',
    emoji: '🎧',
    title: "L'Audio-Match",
    description: 'Écoute et choisis le bon mot!',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'lettres-perdues',
    emoji: '🧩',
    title: 'Lettres Perdues',
    description: 'Place les lettres manquantes!',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'dictee-fantome',
    emoji: '👻',
    title: 'La Dictée Fantôme',
    description: 'Écris le mot tout seul!',
    color: 'from-indigo-500 to-purple-500',
  },
];

export default function ModeSelector({
  onSelectMode,
  onOpenWordList,
  hasWords,
  loading,
  error,
  progress,
  words,
  weeks,
  selectedWeek,
  onSelectWeek,
}: ModeSelectorProps) {
  const masteredCount = words.filter(w => progress[w.id]?.mastered).length;

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (weeks[idx]) {
      onSelectWeek(weeks[idx]);
    }
  };

  const selectedIndex = selectedWeek
    ? weeks.findIndex(w => w.week_start === selectedWeek.week_start && w.sounds === selectedWeek.sounds)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 flex flex-col">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          ✨ Dictée ✨
        </h1>
        <p className="text-white/80 text-lg">
          Pratique ton français!
        </p>
      </div>

      {/* Progress summary */}
      {hasWords && (
        <div className="bg-white/20 rounded-2xl p-4 mx-auto mb-6 max-w-sm">
          <div className="text-center text-white">
            <span className="text-2xl">📚 </span>
            <span className="font-bold">{words.length}</span> mots
            <span className="mx-3">•</span>
            <span className="text-2xl">⭐ </span>
            <span className="font-bold">{masteredCount}</span> maîtrisés
          </div>
        </div>
      )}

      {/* Week selector */}
      {weeks.length > 0 && (
        <div className="bg-white/10 rounded-2xl p-3 mx-auto mb-6 max-w-sm text-center">
          <select
            value={selectedIndex}
            onChange={handleWeekChange}
            className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm w-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {weeks.map((week, idx) => (
              <option key={`${week.week_start}-${week.sounds}`} value={idx} className="text-gray-900">
                {formatWeekLabel(week)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mode cards */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 max-w-md mx-auto w-full">
        {loading ? (
          <div className="bg-white/20 rounded-3xl p-8 text-center">
            <span className="text-5xl animate-bounce">📖</span>
            <p className="text-white text-xl mt-4">
              Chargement des mots...
            </p>
          </div>
        ) : error ? (
          <div className="bg-white/20 rounded-3xl p-8 text-center">
            <span className="text-5xl">😕</span>
            <p className="text-white text-xl mt-4 mb-6">
              Impossible de charger les mots
            </p>
            <button
              onClick={onOpenWordList}
              className="bg-white text-purple-700 font-bold text-xl px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform"
            >
              Réessayer
            </button>
          </div>
        ) : !hasWords ? (
          <div className="bg-white/20 rounded-3xl p-8 text-center">
            <span className="text-5xl">📝</span>
            <p className="text-white text-xl mt-4 mb-6">
              Aucun mot trouvé
            </p>
            <button
              onClick={onOpenWordList}
              className="bg-white text-purple-700 font-bold text-xl px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform"
            >
              Voir les mots
            </button>
          </div>
        ) : (
          <>
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`
                  w-full
                  bg-gradient-to-r ${mode.color}
                  text-white
                  rounded-3xl
                  p-6
                  shadow-lg
                  transition-all duration-200
                  hover:scale-105 hover:shadow-xl
                  active:scale-95
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{mode.emoji}</span>
                  <div className="text-left">
                    <h3 className="text-xl font-bold">{mode.title}</h3>
                    <p className="text-white/80 text-sm">{mode.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Word list button */}
      <div className="text-center py-6">
        <button
          onClick={onOpenWordList}
          className="text-white/60 hover:text-white text-sm underline"
        >
          📚 Voir les mots
        </button>
      </div>
    </div>
  );
}
