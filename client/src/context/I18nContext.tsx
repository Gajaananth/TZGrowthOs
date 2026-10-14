import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.json';
import si from '../i18n/si.json';
import ta from '../i18n/ta.json';

type Language = 'en' | 'si' | 'ta';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const translations: Record<Language, any> = { en, si, ta };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('growthos_lang');
    return (saved === 'si' || saved === 'ta' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('growthos_lang', lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = translations[language] || translations.en;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English
        let fallback: any = translations.en;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return path;
          }
        }
        return typeof fallback === 'string' ? fallback : path;
      }
    }
    return typeof current === 'string' ? current : path;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
