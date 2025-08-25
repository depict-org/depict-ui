import { catchify, queueMacroTask } from "@depict-ai/utilishared";
import { is_category_page, is_search_page } from "./util";
import { Accessor, createEffect, createRoot, untrack } from "solid-js";
import { globalState } from "./global_state";

let set = false;
let padding_animation: Animation | undefined;

/** Will fix NextJS scroll restoration for our search. Works with `experimental.scrollRestoration` (in Next config) true or false
 * Basic approach: Add lots of padding when Depict els are removed to preserve height
 * When Depict is in DOM again, remove padding
 * Also, block window.scrollTo which Next does with `experimental.scrollRestoration` false
 * Warning: Make sure to call this after Next has properly initialized. Running it in a component is safe */
export function nextScrollRestorationFix() {
  /// WARNING WARNING WARNING
  // If you are debugging scroll restoration, make sure you're not in strict mode!!!!! Scroll restoration in nextjs won't work in strict mode because react will nuke all our elements from the DOM and render them again during going back
  // Next 13.x+ has strict mode by default, opt out by setting reactStrictMode: false in next.config.js
  const are_on_search_or_category_page = () => is_search_page() || is_category_page();
  if (set) {
    return; // Just being safe
  }
  set = true;

  // We used to initialise this variable with false which in some cases (scroll to top button in FloatingButtons) would cause the scroll to be blocked when it shouldn't (see https://depictaiworkspace.slack.com/archives/C058KQ3MU8Z/p1686141321127089?thread_ts=1686134246.109689&cid=C058KQ3MU8Z)
  // I don't know why we'd want to initialise it with false? The only reason I can see is in the hopes of scroll restoration working on initial page load, but it basically never does due to react rendering and executing our component too late
  let should_use_old_scroll = true;
  const old_scrollTo = window.scrollTo;
  const next_router_event_target = make_next_router_event_target(); // So we can use once: true

  window.scrollTo = (...args) => {
    if (
      should_use_old_scroll ||
      process.env.__NEXT_SCROLL_RESTORATION ||
      !are_on_search_or_category_page() ||
      history.scrollRestoration === "manual" // I.e. Chimi has manual scroll restoration that we don't want to block https://depictaiworkspace.slack.com/archives/C058KQ3MU8Z/p1686658007164019?thread_ts=1686134246.109689&cid=C058KQ3MU8Z
    ) {
      return Reflect.apply(old_scrollTo, window, args);
    } else {
      should_use_old_scroll = true;
    }
  };

  // When popping state, add padding in the same event as the "popstate" event (required) and then remove it once our stuff is in the DOM
  addEventListener(
    "popstate",
    catchify(() => {
      if (!are_on_search_or_category_page()) {
        removeLotsOfPadding(); // Just making sure
        return;
      }
      should_use_old_scroll = false;

      const [get_search_page_in_dom] = globalState.search_page_in_dom;
      const [get_category_page_in_dom] = globalState.category_page_in_dom;
      const search_page_in_dom = untrack(get_search_page_in_dom);
      const category_page_in_dom = untrack(get_category_page_in_dom);
      const new_is_search = is_search_page();
      const new_is_category = is_category_page();
      let accessor_to_wait_for: Accessor<boolean>;

      if ((search_page_in_dom && new_is_search) || (category_page_in_dom && new_is_category)) {
        // Already on the page we're going to
        removeLotsOfPadding();
        return;
      }
      addLotsOfPadding();

      if (new_is_search && category_page_in_dom) {
        accessor_to_wait_for = get_search_page_in_dom;
      } else if (new_is_category && search_page_in_dom) {
        accessor_to_wait_for = get_category_page_in_dom;
      } else {
        accessor_to_wait_for = new_is_search ? get_search_page_in_dom : get_category_page_in_dom;
      }

      createRoot(dispose =>
        createEffect(() => {
          if (accessor_to_wait_for()) {
            removeLotsOfPadding();
            dispose();
          }
        })
      );
    })
  );

  (window as any)?.next?.router?.events?.on(
    // We have to use the actual next router here, if we'd use next_router_event_target for this window.event wouldn't be the popstate anymore
    "routeChangeStart",
    catchify(() => {
      // this is for when we navigate to a new page (replaceState or pushState)
      // We need to ensure that the page doesn't get shorter before the new history entry has been pushed
      // There is beforeHistoryChange which fires literally the line of code before the history API is called, so we make the page long until a task after that
      // The challenge is knowing on routeChangeStart if we're in a popstate (back/forward) or a pushState/replaceState
      // We use the deprecated window.event property for that
      // This is catchified, so we should see in sentry when it starts failing if browsers ever remove it???
      if (window.event instanceof PopStateEvent) return;
      addLotsOfPadding();
      next_router_event_target.addEventListener(
        "beforeHistoryChange",
        catchify(() => queueMacroTask(removeLotsOfPadding)),
        { once: true }
      );
    })
  );
}

/*
 Here we want to be able to add padding that *definitely* gets applied and then be able to revert precisely to what was before.
 The best way to achieve this is using an animation that with the fill set to none. This is because animations have the absolute highest precedence in CSS, even higher than !important. Then, to revert to the old padding, we just play the animation which is 1ms long so, it immediately finishes and whatever was defined before takes precedence again.
 */
function addLotsOfPadding() {
  if (padding_animation) return; // We're already showing a bunch of padding
  padding_animation = document.body.animate(
    {
      paddingBottom: (history.state?.search_scroll_restoration_data?.[0]?.min_results_loaded || 150) * 500 + "px",
      offset: 0,
    },
    1
  );
  padding_animation.pause();
}

function removeLotsOfPadding() {
  if (padding_animation) {
    padding_animation.play();
    padding_animation = undefined;
  }
}

function make_next_router_event_target() {
  const next_router_event_target = new EventTarget();

  (window as any)?.next?.router?.events?.on("beforeHistoryChange", () =>
    next_router_event_target.dispatchEvent(new CustomEvent("beforeHistoryChange"))
  );
  return next_router_event_target;
}
