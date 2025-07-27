import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ca from './locales/ca.json';

export const locales = {
  en,
  es,
  fr,
  it,
  ca,
};

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = 'es';
