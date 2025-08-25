import { DepictSearch, SearchModalV2 } from "@depict-ai/ui/latest";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { createComputed, on, untrack } from "solid-js";
import * as locales from "@depict-ai/ui/locales/latest";
import { en, Locale } from "@depict-ai/ui/locales/latest";
import { catchify } from "@depict-ai/utilishared/latest";
import { locale_to_price_fmt } from "~/helpers/locale_to_price_fmt";
import { display_transformers } from "~/helpers/url_creator_transformer";
import { make_sdk_on_navigation_cb } from "~/helpers/make_sdk_on_navigation_cb";

export function setup_depict_search() {
  const depict_search = new DepictSearch({
    merchant: untrack(get_merchant),
    market: untrack(get_market),
    localization: en,
    display_transformers,
    enable_category_suggestions: true,
    searchModalComponent: SearchModalV2,
    enable_content_search: true,
    url_transformer: url =>
      (url.pathname = `/${untrack(get_merchant)}/${untrack(get_market)}/${untrack(get_locale)}/search`),
    on_navigation: make_sdk_on_navigation_cb(),
  });

  createComputed(() => (depict_search.merchant = get_merchant()));
  createComputed(() => (depict_search.market = get_market()));
  createComputed(
    on(
      get_locale,
      catchify(async locale => {
        if (!locale || locale === "null") return;
        const localization = locales[locale as keyof typeof locales] as Locale;
        depict_search.localization = {
          ...localization,
          price_formatting_:
            locale_to_price_fmt[locale as keyof typeof locale_to_price_fmt] ||
            locale_to_price_fmt[locale.split("_")[0] as keyof typeof locale_to_price_fmt],
        };
      })
    )
  );

  return depict_search;
}
