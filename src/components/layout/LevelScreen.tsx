import { ReactNode } from 'react';
import SpeedControl from '../common/SpeedControl';
import StarCounter from '../common/StarCounter';

interface LevelScreenProps {
  title: string;
  gradient: string;
  sentenceNumber: number;
  sentenceCount: number;
  day?: number;
  stars: number;
  rate: number;
  onRateChange: (rate: number) => void;
  onBack: () => void;
  children: ReactNode;
}

export default function LevelScreen({
  title,
  gradient,
  sentenceNumber,
  sentenceCount,
  day,
  stars,
  rate,
  onRateChange,
  onBack,
  children,
}: LevelScreenProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradient} p-4 flex flex-col`}>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          onClick={onBack}
          className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-xl transition-colors"
        >
          ← Menu
        </button>
        <StarCounter stars={stars} total={sentenceCount} size="small" />
        <SpeedControl rate={rate} onChange={onRateChange} />
      </header>

      <div className="text-center text-white mb-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-white/80">
          Phrase {sentenceNumber} / {sentenceCount}
          {day !== undefined && <> · Jour {day}</>}
        </p>
      </div>

      <main className="flex-1 flex flex-col items-center gap-6 max-w-4xl w-full mx-auto">{children}</main>
    </div>
  );
}
