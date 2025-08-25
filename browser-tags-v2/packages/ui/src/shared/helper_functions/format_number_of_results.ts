import { Accessor, createMemo } from "solid-js";
import { standard_price_format } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../locales/i18n_types";

/**
 * Function used in CategoryPage and SearchPage to format the number of results according to the number formatting in i18n
 */
export function format_number_of_results({
  number_,
  i18n_,
}: {
  number_: Accessor<number | undefined>;
  i18n_: solid_plp_shared_i18n;
}) {
  return createMemo(() => {
    const numberToFormat = number_();
    if (isNaN(numberToFormat!)) {
      return "";
    }
    const price_formatting = i18n_.price_formatting_();
    return standard_price_format(
      numberToFormat!,
      0, // we never want places after comma here it looks weird as hell
      price_formatting.decimal_places_delimiter_,
      price_formatting.thousands_delimiter_
    );
  });
}
