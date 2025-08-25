import { createMemo, JSX as solid_JSX } from "solid-js";
import { standard_price_format } from "@depict-ai/utilishared";

/**
 * Like standard_price_format except that the price and the formatting are reactive accessors
 */
export function SolidFormatPrice(props: {
  // These are going to be getters, so be careful not to read them too early
  price_: number;
  price_formatting_: {
    pre_: string;
    post_: string;
    decimal_places_delimiter_: string;
    thousands_delimiter_: string;
    places_after_comma_: number | "auto";
  };
}) {
  return createMemo(() => {
    const price_formatting = props.price_formatting_;

    return standard_price_format(
      props.price_,
      price_formatting.places_after_comma_,
      price_formatting.decimal_places_delimiter_,
      price_formatting.thousands_delimiter_
    );
  }) as unknown as solid_JSX.Element;
}
