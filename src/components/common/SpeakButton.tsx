import { useSpeech } from '../../hooks/useSpeech';
import { useLanguage } from '../../i18n/LanguageContext';

interface SpeakButtonProps {
  word: string;
  audioPath?: string;  // Pre-generated audio file path
  size?: 'small' | 'medium' | 'large';
}

export default function SpeakButton({ word, audioPath, size = 'medium' }: SpeakButtonProps) {
  const { language } = useLanguage();
  const { speak, speakAudio, speaking } = useSpeech(language);

  const handleClick = () => {
    if (audioPath) {
      speakAudio(audioPath);
    } else {
      speak(word);
    }
  };

  const sizeClasses = {
    small: 'w-12 h-12 text-xl',
    medium: 'w-16 h-16 text-3xl',
    large: 'w-24 h-24 text-5xl',
  };

  return (
    <button
      onClick={handleClick}
      disabled={speaking}
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-br from-sky to-blue-500
        text-white rounded-full
        shadow-lg shadow-blue-300/50
        flex items-center justify-center
        active:scale-95
        transition-all duration-150
        ${speaking ? 'animate-pulse' : 'hover:scale-105'}
      `}
      aria-label="Play audio"
    >
      {speaking ? (
        <span className="animate-bounce">🔊</span>
      ) : (
        <span>🔈</span>
      )}
    </button>
  );
}
