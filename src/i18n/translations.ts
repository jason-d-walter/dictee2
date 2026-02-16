import { SupportedLanguage } from '../types';

export interface TranslationSet {
  // App
  appTitle: string;
  tagline: string;

  // Progress
  wordCount: (n: number) => string;
  masteredCount: (n: number) => string;

  // Modes
  modeExplorationTitle: string;
  modeExplorationDesc: string;
  modeAudioMatchTitle: string;
  modeAudioMatchDesc: string;
  modeLettresPerduesTitle: string;
  modeLettresPerduesDesc: string;
  modeDicteeFantomeTitle: string;
  modeDicteeFantomeDesc: string;

  // Loading / error states
  loadingWords: string;
  errorLoadingWords: string;
  noWordsFound: string;
  retry: string;
  viewWords: string;
  loading: string;

  // Navigation
  back: string;
  mainMenu: string;

  // Progress in-game
  wordNofM: (current: number, total: number) => string;

  // Game summary
  perfect: string;
  greatJob: string;
  keepGoing: string;
  percentCorrect: (pct: number) => string;
  results: string;
  playAgain: string;

  // Exploration
  explorationTitle: string;
  listeningLabel: string;
  tapToListen: string;
  fallbackHint: string;
  next: string;
  finish: string;

  // Audio Match
  audioMatchTitle: string;
  audioMatchInstruction: string;
  feedbackCorrect: string;
  feedbackTryAgain: string;

  // Lettres Perdues
  lettresPerduesTitle: string;
  lettresPerduesInstruction: string;
  verify: string;
  feedbackPerfect: string;
  feedbackAlmost: string;
  correctAnswerWas: (word: string) => string;

  // Dictee Fantome
  dicteeFantomeTitle: string;
  dicteeFantomeInstruction: string;
  placeholder: string;
  feedbackBravo: string;
  correctAnswerLabel: string;

  // Word list
  wordListHeader: string;
  wordListStats: (total: number, mastered: number) => string;
  wordsOfTheWeek: string;
  mastered: string;
  refreshWords: string;
  wordListFooter: string;
  viewWordList: string;

  // Date locale
  dateLocale: string;
}

const fr: TranslationSet = {
  appTitle: 'Dictée',
  tagline: 'Pratique ton français!',

  wordCount: (n) => `${n} mots`,
  masteredCount: (n) => `${n} maîtrisés`,

  modeExplorationTitle: 'Exploration',
  modeExplorationDesc: 'Découvre les mots avec images et phrases!',
  modeAudioMatchTitle: "L'Audio-Match",
  modeAudioMatchDesc: 'Écoute et choisis le bon mot!',
  modeLettresPerduesTitle: 'Lettres Perdues',
  modeLettresPerduesDesc: 'Place les lettres manquantes!',
  modeDicteeFantomeTitle: 'La Dictée Fantôme',
  modeDicteeFantomeDesc: 'Écris le mot tout seul!',

  loadingWords: 'Chargement des mots...',
  errorLoadingWords: 'Impossible de charger les mots',
  noWordsFound: 'Aucun mot trouvé',
  retry: 'Réessayer',
  viewWords: 'Voir les mots',
  loading: 'Chargement...',

  back: '← Retour',
  mainMenu: 'Menu principal',

  wordNofM: (current, total) => `Mot ${current} sur ${total}`,

  perfect: 'PARFAIT!',
  greatJob: 'Bravo!',
  keepGoing: 'Continue!',
  percentCorrect: (pct) => `${pct}% correct`,
  results: 'Résultats:',
  playAgain: 'Rejouer',

  explorationTitle: 'Exploration',
  listeningLabel: 'Lecture...',
  tapToListen: 'Tap to listen',
  fallbackHint: 'Générez les ressources avec le script Python pour voir plus de contenu!',
  next: 'Suivant →',
  finish: 'Terminer ✓',

  audioMatchTitle: "L'Audio-Match",
  audioMatchInstruction: 'Écoute le mot et tape sur la bonne réponse!',
  feedbackCorrect: 'Bravo!',
  feedbackTryAgain: 'Essaie encore!',

  lettresPerduesTitle: 'Lettres Perdues',
  lettresPerduesInstruction: 'Place les lettres manquantes!',
  verify: 'Vérifier ✓',
  feedbackPerfect: 'Parfait!',
  feedbackAlmost: 'Presque!',
  correctAnswerWas: (word) => `C'était: ${word}`,

  dicteeFantomeTitle: 'La Dictée Fantôme',
  dicteeFantomeInstruction: 'Écoute et écris le mot!',
  placeholder: 'Écris ici...',
  feedbackBravo: 'Bravo!',
  correctAnswerLabel: 'La bonne réponse était:',

  wordListHeader: 'Mes Mots',
  wordListStats: (total, mastered) => `${total} mots • ${mastered} maîtrisés ⭐`,
  wordsOfTheWeek: 'Mots de la semaine',
  mastered: 'Maîtrisé',
  refreshWords: 'Actualiser les mots',
  wordListFooter: 'Les mots sont chargés depuis le fichier words_of_week.txt',
  viewWordList: 'Voir les mots',

  dateLocale: 'fr-FR',
};

const en: TranslationSet = {
  appTitle: 'Spelling Bee',
  tagline: 'Practice your English!',

  wordCount: (n) => `${n} word${n !== 1 ? 's' : ''}`,
  masteredCount: (n) => `${n} mastered`,

  modeExplorationTitle: 'Exploration',
  modeExplorationDesc: 'Discover words with images and sentences!',
  modeAudioMatchTitle: 'Audio Match',
  modeAudioMatchDesc: 'Listen and pick the right word!',
  modeLettresPerduesTitle: 'Missing Letters',
  modeLettresPerduesDesc: 'Fill in the missing letters!',
  modeDicteeFantomeTitle: 'Ghost Dictation',
  modeDicteeFantomeDesc: 'Write the word by yourself!',

  loadingWords: 'Loading words...',
  errorLoadingWords: 'Could not load words',
  noWordsFound: 'No words found',
  retry: 'Retry',
  viewWords: 'View words',
  loading: 'Loading...',

  back: '← Back',
  mainMenu: 'Main menu',

  wordNofM: (current, total) => `Word ${current} of ${total}`,

  perfect: 'PERFECT!',
  greatJob: 'Great job!',
  keepGoing: 'Keep going!',
  percentCorrect: (pct) => `${pct}% correct`,
  results: 'Results:',
  playAgain: 'Play again',

  explorationTitle: 'Exploration',
  listeningLabel: 'Playing...',
  tapToListen: 'Tap to listen',
  fallbackHint: 'Run the Python script to generate more content!',
  next: 'Next →',
  finish: 'Finish ✓',

  audioMatchTitle: 'Audio Match',
  audioMatchInstruction: 'Listen to the word and tap the right answer!',
  feedbackCorrect: 'Well done!',
  feedbackTryAgain: 'Try again!',

  lettresPerduesTitle: 'Missing Letters',
  lettresPerduesInstruction: 'Fill in the missing letters!',
  verify: 'Check ✓',
  feedbackPerfect: 'Perfect!',
  feedbackAlmost: 'Almost!',
  correctAnswerWas: (word) => `It was: ${word}`,

  dicteeFantomeTitle: 'Ghost Dictation',
  dicteeFantomeInstruction: 'Listen and write the word!',
  placeholder: 'Type here...',
  feedbackBravo: 'Well done!',
  correctAnswerLabel: 'The correct answer was:',

  wordListHeader: 'My Words',
  wordListStats: (total, mastered) => `${total} word${total !== 1 ? 's' : ''} • ${mastered} mastered ⭐`,
  wordsOfTheWeek: 'Words of the week',
  mastered: 'Mastered',
  refreshWords: 'Refresh words',
  wordListFooter: 'Words are loaded from the words_of_week.txt file',
  viewWordList: 'View words',

  dateLocale: 'en-US',
};

const translations: Record<SupportedLanguage, TranslationSet> = { fr, en };

export function t(lang: SupportedLanguage): TranslationSet {
  return translations[lang] ?? translations.fr;
}
