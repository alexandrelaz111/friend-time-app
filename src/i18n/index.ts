import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import fr from './fr';
import en from './en';
import es from './es';

// Détecte la langue du téléphone
const deviceLanguage = getLocales()[0]?.languageCode ?? 'fr';

// Mappe vers les langues supportées
const getDefaultLanguage = (): string => {
  if (deviceLanguage.startsWith('es')) return 'es';
  if (deviceLanguage.startsWith('en')) return 'en';
  if (deviceLanguage.startsWith('fr')) return 'fr';
  return 'en'; // Fallback anglais pour les autres langues
};

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
  },
  lng: getDefaultLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
