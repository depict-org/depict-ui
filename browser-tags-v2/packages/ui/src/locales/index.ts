/**
 * Exported naming follows IETF BCP 47: https://en.wikipedia.org/wiki/IETF_language_tag
 * Due to the way we handle locales in the backend, we also export one version of each language with the country code appended. That version will automatically select that version of locale in the backend (where they sometimes have country codes). Let us know if one is missing and we'll add it.
 */

import { Locale } from "./i18n_types";
import { arabic_category_translation, arabic_search_translation } from "./arabic";
import { czech_category_translation, czech_search_translation } from "./czech";
import { danish_category_translation, danish_search_translation } from "./danish";
import { dutch_category_translation, dutch_search_translation } from "./dutch";
import { english_category_translation, english_search_translation } from "./english";
import { finnish_category_translation, finnish_search_translation } from "./finnish";
import { french_category_translation, french_search_translation } from "./french";
import { german_category_translation, german_search_translation } from "./german";
import { italian_category_translation, italian_search_translation } from "./italian";
import { norwegian_category_translation, norwegian_search_translation } from "./norwegian";
import { polish_category_translation, polish_search_translation } from "./polish";
import { portuguese_category_translation, portuguese_search_translation } from "./portuguese";
import { spanish_category_translation, spanish_search_translation } from "./spanish";
import { swedish_category_translation, swedish_search_translation } from "./swedish";

export type { Locale, plp_shared_i18n, search_i18n, category_i18n } from "./i18n_types";

export const ar: Locale = { ...arabic_category_translation, ...arabic_search_translation, backend_locale_: "ar" };
export const ar_SA: Locale = { ...arabic_category_translation, ...arabic_search_translation, backend_locale_: "ar_SA" };
export const cz: Locale = { ...czech_category_translation, ...czech_search_translation, backend_locale_: "cz" };
export const da: Locale = { ...danish_category_translation, ...danish_search_translation, backend_locale_: "da" };
export const da_DK: Locale = { ...danish_category_translation, ...danish_search_translation, backend_locale_: "da_DK" };
export const nl: Locale = { ...dutch_category_translation, ...dutch_search_translation, backend_locale_: "nl" };
export const nl_BE: Locale = { ...dutch_category_translation, ...dutch_search_translation, backend_locale_: "nl_BE" };
export const nl_NL: Locale = { ...dutch_category_translation, ...dutch_search_translation, backend_locale_: "nl_NL" };
export const en: Locale = { ...english_category_translation, ...english_search_translation, backend_locale_: "en" };
export const en_AU: Locale = {
  ...english_category_translation,
  ...english_search_translation,
  backend_locale_: "en_AU",
};
export const en_CA: Locale = {
  ...english_category_translation,
  ...english_search_translation,
  backend_locale_: "en_CA",
};
export const en_EU: Locale = {
  ...english_category_translation,
  ...english_search_translation,
  backend_locale_: "en_EU",
};
export const en_GB: Locale = {
  ...english_category_translation,
  ...english_search_translation,
  backend_locale_: "en_GB",
};
export const en_IE: Locale = {
  ...english_category_translation,
  ...english_search_translation,
  backend_locale_: "en_IE",
};
export const en_US: Locale = {
  ...english_category_translation,
  ...english_search_translation,
  backend_locale_: "en_US",
};
export const fi: Locale = { ...finnish_category_translation, ...finnish_search_translation, backend_locale_: "fi" };
export const fi_FI: Locale = {
  ...finnish_category_translation,
  ...finnish_search_translation,
  backend_locale_: "fi_FI",
};
export const fr: Locale = { ...french_category_translation, ...french_search_translation, backend_locale_: "fr" };
export const fr_FR: Locale = { ...french_category_translation, ...french_search_translation, backend_locale_: "fr_FR" };
export const fr_CA: Locale = { ...french_category_translation, ...french_search_translation, backend_locale_: "fr_CA" };
export const de: Locale = { ...german_category_translation, ...german_search_translation, backend_locale_: "de" };
export const de_AT: Locale = { ...german_category_translation, ...german_search_translation, backend_locale_: "de_AT" };
export const de_CH: Locale = { ...german_category_translation, ...german_search_translation, backend_locale_: "de_CH" };
export const de_DE: Locale = { ...german_category_translation, ...german_search_translation, backend_locale_: "de_DE" };
export const it: Locale = { ...italian_category_translation, ...italian_search_translation, backend_locale_: "it" };
export const it_IT: Locale = {
  ...italian_category_translation,
  ...italian_search_translation,
  backend_locale_: "it_IT",
};
export const no: Locale = { ...norwegian_category_translation, ...norwegian_search_translation, backend_locale_: "no" };
export const nb_NO: Locale = {
  ...norwegian_category_translation,
  ...norwegian_search_translation,
  backend_locale_: "nb_NO",
};
export const nb: Locale = {
  ...norwegian_category_translation,
  ...norwegian_search_translation,
  backend_locale_: "nb",
};
export const no_NO: Locale = {
  ...norwegian_category_translation,
  ...norwegian_search_translation,
  backend_locale_: "no_NO",
};
export const pl: Locale = { ...polish_category_translation, ...polish_search_translation, backend_locale_: "pl" };
export const pl_PL: Locale = { ...polish_category_translation, ...polish_search_translation, backend_locale_: "pl_PL" };
export const pt: Locale = {
  ...portuguese_category_translation,
  ...portuguese_search_translation,
  backend_locale_: "pt",
};
export const es: Locale = { ...spanish_category_translation, ...spanish_search_translation, backend_locale_: "es" };
export const es_ES: Locale = {
  ...spanish_category_translation,
  ...spanish_search_translation,
  backend_locale_: "es_ES",
};
export const sv: Locale = { ...swedish_category_translation, ...swedish_search_translation, backend_locale_: "sv" };
export const sv_SE: Locale = {
  ...swedish_category_translation,
  ...swedish_search_translation,
  backend_locale_: "sv_SE",
};
export const defaultLocale: Locale = en;
