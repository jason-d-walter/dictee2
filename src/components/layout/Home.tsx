import { useState } from 'react';
import { BlankStep, Level, SentenceProgress, WeekEntry, WeekManifest } from '../../types';

interface HomeProps {
  weeks: WeekEntry[];
  selectedWeek: WeekEntry | null;
  onSelectWeek: (week: WeekEntry) => void;
  manifest: WeekManifest | null;
  loading: boolean;
  error: boolean;
  progressOf: (sentenceId: string) => SentenceProgress;
  onStart: (level: Level, step: BlankStep) => void;
}

const STEP_NAMES: Record<BlankStep, string> = { 1: 'Le son', 2: 'Plus de mots', 3: 'La moitié' };

function formatWeek(week: WeekEntry): string {
  const start = new Date(`${week.week_start}T00:00:00`);
  const end = new Date(`${week.week_end}T00:00:00`);
  const month = end.toLocaleDateString('fr-CA', { month: 'long' });
  return `${start.getDate()}–${end.getDate()} ${month} · « ${week.focus} »`;
}

export default function Home({ weeks, selectedWeek, onSelectWeek, manifest, loading, error, progressOf, onStart }: HomeProps) {
  const sentences = manifest?.sentences ?? [];
  const progress = sentences.map(s => progressOf(s.id));
  const explored = progress.filter(p => p.explored).length;
  const lowestStep = progress.length ? Math.min(...progress.map(p => p.blanksStep)) : 0;
  const [chosenStep, setStep] = useState<BlankStep | null>(null);
  const step = chosenStep ?? (Math.min(3, lowestStep + 1) as BlankStep);
  const dicteeAverage = progress.length ? progress.reduce((sum, p) => sum + p.dicteeBest, 0) / progress.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 flex flex-col items-center gap-6">
      <header className="text-center pt-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">✨ Ma dictée ✨</h1>
        <p className="text-white/80 text-lg">Écoute, comprends et écris la phrase</p>
      </header>

      {weeks.length > 1 && selectedWeek && (
        <select
          value={selectedWeek.path}
          onChange={e => onSelectWeek(weeks.find(w => w.path === e.target.value)!)}
          className="bg-white/20 text-white border border-white/30 rounded-xl px-4 py-2 text-lg max-w-sm w-full"
        >
          {weeks.map(week => (
            <option key={week.path} value={week.path} className="text-slate-900">
              {formatWeek(week)}
            </option>
          ))}
        </select>
      )}
      {weeks.length === 1 && selectedWeek && <p className="text-white text-xl font-bold">{formatWeek(selectedWeek)}</p>}

      {loading ? (
        <Message emoji="📖" text="Chargement…" />
      ) : error || sentences.length === 0 ? (
        <Message emoji="😕" text="Aucune phrase trouvée pour cette semaine." />
      ) : (
        <div className="flex flex-col gap-4 max-w-md w-full">
          <LevelCard
            emoji="🔍"
            title="1 · J'explore"
            description="Écoute la phrase, découvre ses mots et le son de la semaine."
            status={`${explored} / ${sentences.length} phrases explorées`}
            gradient="from-amber-500 to-orange-500"
            onStart={() => onStart('explorer', step)}
          />
          <LevelCard
            emoji="🧩"
            title="2 · Les mots manquants"
            description="Remets les mots qui manquent à la bonne place."
            status={lowestStep > 0 ? `Étape ${lowestStep} réussie` : 'Pas encore commencé'}
            gradient="from-teal-500 to-emerald-500"
            onStart={() => onStart('mots-manquants', step)}
          >
            <div className="flex gap-2 mt-3">
              {([1, 2, 3] as BlankStep[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`flex-1 rounded-xl py-2 font-bold transition-all ${
                    step === s ? 'bg-white text-emerald-600 shadow-md' : 'bg-white/20 text-white'
                  }`}
                >
                  {s} · {STEP_NAMES[s]}
                </button>
              ))}
            </div>
          </LevelCard>
          <LevelCard
            emoji="✏️"
            title="3 · La dictée"
            description="Écoute et écris toute la phrase toute seule."
            status={dicteeAverage > 0 ? `Meilleur score : ${Math.round(dicteeAverage * 100)} %` : 'Pas encore commencé'}
            gradient="from-indigo-500 to-purple-500"
            onStart={() => onStart('dictee', step)}
          />
        </div>
      )}
    </div>
  );
}

interface LevelCardProps {
  emoji: string;
  title: string;
  description: string;
  status: string;
  gradient: string;
  onStart: () => void;
  children?: React.ReactNode;
}

function LevelCard({ emoji, title, description, status, gradient, onStart, children }: LevelCardProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} text-white rounded-3xl p-5 shadow-lg`}>
      <button onClick={onStart} className="w-full flex items-center gap-4 text-left active:scale-95 transition-transform">
        <span className="text-5xl">{emoji}</span>
        <span className="flex-1">
          <span className="block text-2xl font-bold">{title}</span>
          <span className="block text-white/90">{description}</span>
          <span className="block text-white/70 text-sm mt-1">{status}</span>
        </span>
        <span className="text-3xl">▶</span>
      </button>
      {children}
    </div>
  );
}

function Message({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="bg-white/20 rounded-3xl p-8 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="text-white text-xl mt-4">{text}</p>
    </div>
  );
}
