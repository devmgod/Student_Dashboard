import enTranslations from './locales/en.json';
import caTranslations from './locales/ca.json';

export const translations = {
  en: enTranslations,
  ca: caTranslations,
};

// Language names for display
export const languageNames = {
  en: 'English',
  ca: 'Català',
};

// Get initial language from localStorage or default to Catalan
export function getInitialLanguage() {
  const savedLanguage = localStorage.getItem('appLanguage');
  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }
  return 'ca'; // Default to Catalan
}

/**
 * Translation function
 * @param {string} key - Translation key (e.g., "common.loading" or "buttons.connectWithGoogle")
 * @param {object} params - Optional parameters for string interpolation
 * @param {string} lang - Language code (optional, uses current language if not provided)
 * @returns {string} Translated string
 */
export function t(key, params = {}, lang = null) {
  const language = lang || getInitialLanguage();
  const keys = key.split('.');
  let translation = translations[language];
  
  for (const k of keys) {
    if (translation && translation[k]) {
      translation = translation[k];
    } else {
      // Fallback to English if translation not found
      translation = translations.en;
      for (const fallbackKey of keys) {
        if (translation && translation[fallbackKey]) {
          translation = translation[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  // If translation is a string, apply parameters
  if (typeof translation === 'string') {
    return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }
  
  return translation || key;
}

export function setLanguage(lang) {
  if (translations[lang]) {
    localStorage.setItem('appLanguage', lang);
    return true;
  }
  return false;
}

export default { t, setLanguage, getInitialLanguage, translations, languageNames };

