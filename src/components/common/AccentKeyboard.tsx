import { SupportedLanguage } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface AccentKeyboardProps {
  onCharacter: (char: string) => void;
  disabled?: boolean;
}

const ACCENT_CHARACTERS: Record<SupportedLanguage, string[]> = {
  fr: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù'],
  en: [],
};

export default function AccentKeyboard({ onCharacter, disabled }: AccentKeyboardProps) {
  const { language } = useLanguage();
  const chars = ACCENT_CHARACTERS[language] ?? ACCENT_CHARACTERS.fr;

  if (chars.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 p-4">
      {chars.map(char => (
        <button
          key={char}
          onClick={() => onCharacter(char)}
          disabled={disabled}
          className={`
            w-14 h-14 md:w-16 md:h-16
            text-2xl md:text-3xl font-bold
            bg-white text-purple-700
            rounded-2xl shadow-lg
            border-4 border-purple-300
            active:scale-95 active:bg-purple-100
            transition-all duration-100
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-purple-50 hover:border-purple-400
          `}
        >
          {char}
        </button>
      ))}
    </div>
  );
}
