import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import pt from '../locales/pt.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
};

// 1. Detect device system language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
const supportedLanguages = ['en', 'es', 'fr', 'pt'];
const defaultLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

// 2. Load manually saved language preference on start
if (typeof window !== 'undefined') {
  AsyncStorage.getItem('user-language')
    .then((savedLanguage) => {
      if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
        i18n.changeLanguage(savedLanguage);
      }
    })
    .catch((err) => {
      console.log("Error loading saved language from AsyncStorage:", err);
    });
}

export default i18n;
