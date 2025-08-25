import { catchify, dwarn, instant_exec_on_suspect_history_change, report } from "@depict-ai/utilishared";
import { ListingQuery } from "../../sdks/types";
import { allowNativeNavigation } from "./allowNativeNavigation";

export type OnNavigation =
  | ((options: { is_replace: boolean; new_url: URL; scroll: boolean }) => void)
  | "hard_navigation";
/* Places we navigate:

1. clear_filters_when_going_sideways to remove query param
 */

/**
 * Not a router that does our custom routing on non-spas and otherwise plugs into other routers and generalises their functionality
 */
export class PseudoRouter {
  /**
   * Function that will be called when we want to navigate, or a string saying it's not an SPA. You can change this OTG
   */
  on_navigation_: OnNavigation;
  /**
   * We store listing_id in history.state and do operate on this both here and in js-ui, this is the key to be used which js-ui provides
   */
  listing_query_state_key: string | undefined;
  #throwing_on_navigation(...args: Parameters<Exclude<OnNavigation, "hard_navigation">>) {
    const { on_navigation_ } = this;
    if (typeof on_navigation_ !== "function") {
      throw new Error("on_navigation_ is not a function");
    }
    // make sure that we don't accidentally catchify if the SDK consumer has fucked up
    try {
      return on_navigation_(...args);
    } catch (e) {
      queueMicrotask(() => {
        throw e;
      });
    }
  }
  /**
   * Vue has async router that needs to be awaited (it navigates after a microtask)
   * This standardises waiting for all kinds of routers
   */
  #get_navigation_happened_promise(is_replace: boolean) {
    return new Promise<void>(resolve => {
      const handler = (what_happened?: "replaceState" | "pushState" | "popstate") => {
        if (what_happened === (is_replace ? "replaceState" : "pushState")) {
          resolve();
          instant_exec_on_suspect_history_change.delete(handler);
        }
      };
      instant_exec_on_suspect_history_change.add(handler);
    });
  }
  navigate_ = {
    /**
     * Call this if you *just* want to replace the state object in history.state
     */
    replace_state_: (new_state: { [key: string]: any }) => {
      // This doesn't break any router, so we just do this directly for now, since many don't expose an interface for changing the state
      globalThis?.history?.replaceState(new_state, "");
    },
    /**
     * Call this to change the URL
     * @param new_url_ new URL to go to
     * @param event_ event if you have this in a click handler, will not do anything on cmd/ctrl or non-left click then
     * @param force_spa_navigation_ if you want to force SPA navigation even if on_navigation_ is set to "hard_navigation". You should only set this to true for inter-SDK-page navigations
     * @param is_replace_ if you want to replace the current URL in history instead of pushing a new one
     * @param listing_id_ If you are navigating to a category and know the listing_id of, please provide it. This is for making a better devEx in js-ui
     */
    go_to_: catchify(
      async ({
        new_url_: raw_new_url,
        event_,
        force_spa_navigation_,
        is_replace_,
        listing_query_,
        scroll = true,
      }: {
        new_url_: string | URL;
        event_?: MouseEvent;
        force_spa_navigation_?: boolean;
        is_replace_: boolean;
        listing_query_?: ListingQuery;
        scroll?: boolean;
      }) => {
        const new_url_ = raw_new_url instanceof URL ? raw_new_url : new URL(raw_new_url, location.href);
        const wants_hard_navigation = this.on_navigation_ === "hard_navigation";
        if (allowNativeNavigation(event_)) return;
        const different_origin = new_url_.origin !== location.origin;
        if (wants_hard_navigation && (!force_spa_navigation_ || different_origin)) {
          if (force_spa_navigation_ && different_origin) {
            // If we call history.pushState on a different origin, it will throw an error, so fallback to hard navigations
            dwarn(
              "Can't single page navigate to",
              new_url_.href,
              "due to different origin, this MIGHT mean you should fix the URLs"
            );
          }
          if (!event_) {
            // If we haven't gotten an event, nothing will happen by not calling prevent default, so we need to change the URL
            location.assign(new_url_);
          }
          return;
        }
        event_?.preventDefault();
        const promise = this.#get_navigation_happened_promise(true);

        if (force_spa_navigation_ && wants_hard_navigation) {
          // Don't allow hard navigation if we're forcing SPA navigation, which we do for things where PageReplacer can be used for performance
          const new_state = history.state;
          if (listing_query_) {
            // In JS-UI we need to know the listing_id of the current category, therefore push it into state
            if (!this.listing_query_state_key) report(new Error("listing_query_state_key is not set"), "error");
            new_state[this.listing_query_state_key!] = listing_query_;
          }
          history[is_replace_ ? "replaceState" : "pushState"](new_state, "", new_url_);
        } else {
          this.#throwing_on_navigation.call(this, {
            is_replace: is_replace_,
            new_url: new_url_ instanceof URL ? new_url_ : new URL(new_url_, location.href),
            scroll,
          });
        }

        await promise;
      }
    ),
  };

  constructor(on_navigation: OnNavigation, listing_query_state_key?: string) {
    this.listing_query_state_key = listing_query_state_key;
    this.on_navigation_ = on_navigation;
  }
}
