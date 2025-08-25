import { createComputed, createSignal, JSX } from "solid-js";
import { useParams } from "@solidjs/router";

const initial_split_pathname = /*@__PURE__*/ (() => globalThis?.location?.pathname.split("/") || [])();
const merchant_signal = /*@__PURE__*/ createSignal<string>(initial_split_pathname[1]);
const market_signal = /*@__PURE__*/ createSignal<string>(initial_split_pathname[2]);
const locale_signal = /*@__PURE__*/ createSignal<string>(initial_split_pathname[3]);
export const [get_merchant] = merchant_signal;
export const [get_market] = market_signal;
export const [get_locale] = locale_signal;

export function PathnameStateProvider(props: { children: JSX.Element }) {
  // We can only get this once we're actually inside a route. It's idiotic IMO since the URL is always available. I should have just went with good old navigation interception…
  const params = useParams<{ merchant: string; market: string; locale: string }>();

  for (const [name, signal] of [
    ["merchant", merchant_signal],
    ["market", market_signal],
    ["locale", locale_signal],
  ] as const) {
    const [, set_signal] = signal;
    createComputed(() => {
      let value = params[name];
      if (value === "null") {
        value = "";
      }
      set_signal(value);
    });
  }

  return props.children;
}
