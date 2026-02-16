import { createContext, useContext, useMemo, ReactNode } from 'react';
import { SupportedLanguage } from '../types';
import { t, TranslationSet } from './translations';

interface LanguageContextValue {
  language: SupportedLanguage;
  translations: TranslationSet;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'fr',
  translations: t('fr'),
});

interface LanguageProviderProps {
  language: SupportedLanguage;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const value = useMemo(() => ({
    language,
    translations: t(language),
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
