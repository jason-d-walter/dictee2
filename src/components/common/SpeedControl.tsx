import { SPEEDS } from '../../hooks/useSpeed';

interface SpeedControlProps {
  rate: number;
  onChange: (rate: number) => void;
}

export default function SpeedControl({ rate, onChange }: SpeedControlProps) {
  return (
    <div className="flex bg-white/20 rounded-2xl p-1 gap-1" role="radiogroup" aria-label="Vitesse">
      {SPEEDS.map(speed => (
        <button
          key={speed.rate}
          role="radio"
          aria-checked={rate === speed.rate}
          aria-label={speed.name}
          title={speed.name}
          onClick={() => onChange(speed.rate)}
          className={`w-11 h-11 rounded-xl text-2xl transition-all ${
            rate === speed.rate ? 'bg-white shadow-md scale-105' : 'opacity-70 hover:opacity-100'
          }`}
        >
          {speed.label}
        </button>
      ))}
    </div>
  );
}
