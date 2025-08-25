import { createComputed, on, untrack } from "solid-js";
import { DepictCategory } from "@depict-ai/ui/latest";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import * as locales from "@depict-ai/ui/locales/latest";
import { en, Locale } from "@depict-ai/ui/locales/latest";
import { catchify } from "@depict-ai/utilishared/latest";
import { locale_to_price_fmt } from "~/helpers/locale_to_price_fmt";
import { display_transformers } from "~/helpers/url_creator_transformer";
import { make_sdk_on_navigation_cb } from "~/helpers/make_sdk_on_navigation_cb";

export function setup_depict_category() {
  const depict_category = new DepictCategory({
    merchant: untrack(get_merchant),
    market: untrack(get_market),
    localization: en,
    display_transformers,
    on_navigation: make_sdk_on_navigation_cb(),
  });

  createComputed(() => (depict_category.merchant = get_merchant()));
  createComputed(() => (depict_category.market = get_market()));
  createComputed(
    on(
      get_locale,
      catchify(async locale => {
        if (!locale || locale === "null") return;
        const localization = locales[locale as keyof typeof locales] as Locale;
        depict_category.localization = {
          ...localization,
          price_formatting_:
            locale_to_price_fmt[locale as keyof typeof locale_to_price_fmt] ||
            locale_to_price_fmt[locale.split("_")[0] as keyof typeof locale_to_price_fmt] ||
            localization.price_formatting_,
        };
      })
    )
  );

  return depict_category;
}
