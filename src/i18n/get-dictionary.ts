import en from "./dictionaries/en.json";
import da from "./dictionaries/da.json";

export type Locale = "en" | "da";
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  da,
};

/**
 * Returns the dictionary for the specified locale, falling back strictly to English.
 */
export function getDictionary(locale?: string): Dictionary {
  if (locale === "da") {
    return dictionaries.da;
  }
  return dictionaries.en;
}
