import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import bn from "./bn.json";

export const SUPPORTED_LANGS = ["en", "bn"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

let initialized = false;

export function ensureI18n() {
  if (initialized) return i18n;
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  initialized = true;
  return i18n;
}

ensureI18n();

export default i18n;
