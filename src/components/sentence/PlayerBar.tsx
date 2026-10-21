interface PlayerBarProps {
  playing: boolean;
  onPlayAll: () => void;
  onPlayGroups?: () => void;
  onStop: () => void;
}

const BUTTON = 'flex items-center gap-2 px-5 py-3 rounded-2xl text-xl font-bold text-white shadow-lg active:scale-95 transition-transform';

export default function PlayerBar({ playing, onPlayAll, onPlayGroups, onStop }: PlayerBarProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {playing ? (
        <button onClick={onStop} className={`${BUTTON} bg-gradient-to-r from-coral to-red-500`}>
          ⏹ Stop
        </button>
      ) : (
        <>
          <button onClick={onPlayAll} className={`${BUTTON} bg-gradient-to-r from-sky to-blue-500`}>
            🔊 Toute la phrase
          </button>
          {onPlayGroups && (
            <button onClick={onPlayGroups} className={`${BUTTON} bg-gradient-to-r from-lavender to-purple-500`}>
              🧩 Groupe par groupe
            </button>
          )}
        </>
      )}
    </div>
  );
}
