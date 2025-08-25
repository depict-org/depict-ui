import { observer } from "../element-observer";
import { Display, Node_Array } from "../rendering/recommendation-renderer/types";
import { err } from "../deprecated/err";
import { catchify, report } from "../logging/error";
import { dlog } from "../logging/dlog";

let existing_style_tag: Promise<HTMLStyleElement>;
let reactions_in_last_s = 0;
// Use one tag for inserting all styling.
// Probably faster, and helps not pollute the doc with tags.
export const insert_styling = /*@__PURE__*/ catchify(async (css: string) => {
  const style_tag = await (existing_style_tag ||= observer.wait_for_element("head").then(head => {
    const tag = document.createElement("style");

    observer.onremoved(
      // reinsertion for next.js's "portable" <head>
      tag,
      eoe => {
        if (document.head.contains(tag)) {
          // just make sure to not freak out if it's already been added again
          return;
        }
        if (reactions_in_last_s >= 10) {
          report(
            new Error("Someone removed our styling but insists on it (10 removals in previous second). Giving up 😫"),
            "error"
          );
          return;
        }
        dlog("Someone removed our styling 😤, reinserting", eoe);
        reactions_in_last_s++;
        setTimeout(() => reactions_in_last_s--, 1000);
        document.head.append(tag); // we're sure that head exists now since we inserted it there previously
      }
    );

    dlog("inserting", tag, "into", head);
    return head.appendChild(tag);
  }));

  style_tag.append(css);
});

/**
 * Basically a RecRendererResult with less strict typing
 */
export interface Surface<T extends Display> {
  elements?: Node_Array;
  displays?: T[];
  should_stay_inserted?: Promise<boolean>;
}

/**
 * Functions existing on ChildNode that are commonly used to insert recommendations into the DOM
 */
export type InsertionVerb = "after" | "before" | "replaceWith" | "append" | "prepend" | "replaceChildren";

/**
 * Tries to extract a product id from an url.
 * The method used to retrive product id used here is very narrow, probably better to use something else instead?
 *
 * @example normal_get_product_id("www.foo.com/bar/baz.html") // "baz"
 *
 * @param url The url to check, defaults to `window.location`
 * @returns
 */
export const normal_get_product_id = (url?: string) =>
  (url ? new URL(url, window.location.origin) : window.location).pathname
    .split("/")
    .filter(a => a)
    .pop()
    ?.replace(/\.html?$/i, "") || "";

declare global {
  interface Document {
    depictwashere: boolean;
  }
}
/**
 * If you need custom market logic that {@link depict_init_with_market_logic} doesn't support then use this function.
 *
 * Used to initialize an integration-script, this should always be the entrypoint of an integration.
 *
 * Makes sure that your script doesn't run twice
 */
export const depict_init = (callback: () => Promise<void>) => {
  if (document.depictwashere) {
    if (process.env.BUILD_TARGET === "dev") {
      dlog("HMR tried to rerun us, reloading page");
      /* eslint-disable no-self-assign */
      location.href = location.href;
    }
    dlog("Script has already ran", document.currentScript, "is exiting");
    return;
  }
  if (process.env.BUILD_TARGET === "dev") {
    /* eslint-disable no-console */
    console.clear = new Proxy(console.clear, {
      apply(target, this_arg, arg_list) {
        if (
          new Error().stack
            ?.split("\n")
            .filter(Boolean)
            .some(s => s.includes("http://localhost:1234/depict-ai.js"))
        ) {
          /* eslint-disable no-console */
          console.log("CSS change detected through hack, reloading");
          location.reload();
        }
        return target.apply(this_arg, arg_list);
      },
    });
  }
  document.depictwashere = true;

  callback().catch(err);
};

/**
 * Initialize an integration-script like {@link depict_init}, but with automatic handling of unsupported and unknown markets.
 *
 * @param options.extract_market A function that extracts the current market, and if the market is supported, unsupported or unknown
 * @param options.callback If `extract_market` returned a supported market, calls `depict_init` with this callback.
 * @param options.supported_markets Markets where our script should run, in order to get the best typechecking you should add a `as const`
 * modifier to this type like so `["foo", "bar"] as const`.
 * @param options.unsupported_markets Markets we are aware of and where our script shouldn't run.
 * @param options.preferred_demo_market Market to use on .demo.depict.ai, if an override is needed for all users.
 * depict-override-market query parameter will override this behaviour.
 *
 * ### Behaviour
 *
 * - market is unsupported - log to console and exit
 * - market is unknown - report to sentry and exit
 *
 * ### Override market
 *
 * When running in debug mode the market can be overridden by setting a `depict-override-market` query param.
 * For example http://tenant.domain?depict-override-market=ez
 */
export function depict_init_with_market_logic<T extends readonly string[]>(
  callback: (market: T[number]) => Promise<void>,
  get_market: () => Promise<string | undefined> | string | undefined,
  supported_markets: T,
  unsupported_markets: string[],
  preferred_demo_market?: string
) {
  depict_init(async () => {
    // Handle override for debug scripts (could be used on demo pages too)
    if (process.env.DEBUG === "true") {
      let localstorage_override: string | null;
      const query_param_override = new URLSearchParams(location.search).get("depict-override-market");
      if (query_param_override !== null) {
        dlog(`Found ?depict-override-market=${query_param_override}. Using that as the market`);
        get_market = () => query_param_override;
        localStorage.setItem("depict-override-market", query_param_override);
      } else if ((localstorage_override = localStorage.getItem("depict-override-market")) !== null) {
        dlog(`Found depict-override-market="${localstorage_override}" in localStorage. Using that as the market`);
        get_market = () => localstorage_override!;
      }
    }

    const market = await get_market();
    if (supported_markets.includes(market!)) {
      dlog(`Initializing with market: ${market}`);
      return callback(market!).catch(err);
    } else if (unsupported_markets.includes(market!)) {
      dlog(`Unsupported market: ${market}. Exiting...`);
      return;
    } else if (process.env.DEBUG === "true" && location.host.endsWith(".demo.depict.ai") && preferred_demo_market) {
      dlog(`On demosite with default market override. Setting market to ${preferred_demo_market}`);
      return callback(preferred_demo_market).catch(err);
    } else {
      err(new Error(`Unknown market: "${market}". Exiting...`));
      return;
    }
  });
}
