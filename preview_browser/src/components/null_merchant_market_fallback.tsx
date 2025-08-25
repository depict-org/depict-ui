import { createMemo, JSX, Show } from "solid-js";
import { get_locale, get_market, get_merchant } from "~/helpers/url_state";
import { Home } from "~/pages/home";

/**
 * The solid-start router tells us that these "pathname parameters" exist when there's nothing (i.e. just /stronger//recommendations). To work around that we make the aforementioned case /stronger/null/recommendations but therefore all components in "with_data" have to be wrapped in this component, so we can treat the "null" value as another route.
 */
export function NullMerchantMarketFallback(props: { children?: JSX.Element }) {
  const needs_what = createMemo(() => {
    const needs: string[] = [];
    if (!get_merchant()) {
      needs.push("merchant");
    }
    if (!get_market()) {
      needs.push("market");
    }
    if (!get_locale()) {
      needs.push("locale");
    }
    return needs as [] | ["locale"] | ["market", "locale"] | ["merchant", "market", "locale"];
  });
  return (
    <Show when={get_merchant() && get_market() && get_locale()} fallback={<Home needs={needs_what()} />}>
      {props.children}
    </Show>
  );
}
