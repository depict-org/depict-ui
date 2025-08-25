import {
  catchify,
  Disconnector,
  dlog,
  href_change_ipns,
  insert_surfaces,
  instant_exec_on_suspect_history_change,
  make_asyncIterable_exiter,
  Node_Array,
  observer,
  report,
} from "@depict-ai/utilishared";
import { createRoot } from "solid-js";
import { setup_fast_leave } from "./helper_functions/setup_fast_leave";

export interface PageReplacer {
  readonly render_: () => Node_Array;
  readonly is_page_: (url: URL) => boolean;
  readonly title_?: string;
  readonly selector_: string;
  readonly append_instead_of_replace_?: boolean;
}

/**
 * PageReplacer is a class that can be used to layer an SPA (single page application) on top of a non-SPA, for certain pages.
 * An example use case is that we want to make it absolutely instant to go to a search page or to go from one search query to the next (so basically one can navigate to pages without reloading the page).
 * PageReplacer works by, when something has changed the URL (using history.pushState) to the page where it should take effect, replacing a specified element with another element.
 * The element that is replaced is specified by a CSS selector and usually represents the element containing "main content" of the page. The "replacement" works by setting `display: none` on the original page and then adding the "new page"-element after it in the DOM:
 * @param render_ A function that returns the elements which replace the "page" when is_page_ returns true.
 * @param title_ The title that document.title should be changed to when is_page_ returns true (the replacement page is open).
 * @param is_page_ A function that returns true if the provided URL is the page where the replacement should take effect.
 * @param selector_ A CSS selector that selects the element that should be replaced.
 * @param append_instead_of_replace_ If true, the replacement element will be appended to the element that is found by selector_ instead of replacing it. This is useful if one doesn't actually want it to replace the element because one has other logic.
 */
export class PageReplacer extends EventTarget {
  #stop_listening: VoidFunction | undefined;
  #disconnect_observer: Disconnector | undefined;
  #revert_fns: VoidFunction[] = [];
  #is_open = false;
  static #reverting_permitted = true;
  static #visited_urls = /*@__PURE__*/ (() => {
    // Keep track of all URLs that have been visited since the document that was initially loaded (loaded means the process where the browser creates a new `document` and `window` object).
    catchify(async () => {
      // Static initialization blocks aren't supported in MobileSafari yet, otherwise this would be one.
      // I don't think we want to ship a library that users are *forced* to transpile, it should run in the newest version of all major browsers. So we'll just use a function wrapper for now (adding "last 1 ios version" to the build target does a bunch of other unneeded transpilations).
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks
      for await (const href of href_change_ipns) {
        PageReplacer.#visited_urls.add(clean_url(href));
      }
    })();

    return new Set<string>();
  })();

  /**
   * Returns if the "replacement page" is currently open
   */
  get open_() {
    // make this "readonly" from the outside, the only way to open is by making the url change so that is_page_ returns true
    return this.#is_open;
  }

  async #listen() {
    const [exit_ipns, exitable_ipns] = make_asyncIterable_exiter(href_change_ipns);
    this.#stop_listening = exit_ipns;

    const caught_page_check_fn = catchify(this.is_page_, "page check failed");
    for await (const href of exitable_ipns) {
      const url = new URL(href);

      if (!caught_page_check_fn(url)) {
        this.#unload();
        continue;
      }
      if (this.#is_open) {
        continue;
      }
      const els = this.#get_rendered_recs();
      if (!els?.length) {
        // rendering failed, don't replace page
        continue;
      }
      this.#load(els);
    }
  }

  #get_rendered_recs() {
    return createRoot(dispose => {
      this.addEventListener("close", dispose, { once: true });
      return catchify(this.render_, "rendering failed")() || [];
    });
  }

  #unload = /*@__PURE__*/ catchify(() => {
    if (!this.#is_open) {
      return;
    }

    this.#disconnect_observer?.();
    if (PageReplacer.#reverting_permitted) {
      while (this.#revert_fns.length) {
        this.#revert_fns.pop()?.();
      }
    }
    this.#is_open = false;
    this.dispatchEvent(new CustomEvent("close"));
  }, "failed to close page");

  #load = /*@__PURE__*/ catchify(async (els: Node_Array) => {
    this.#is_open = true;
    // So that #load doesn't get called again
    let set_should_stay_inserted: ((value: boolean | PromiseLike<boolean>) => void) | undefined;
    const should_stay_inserted = new Promise<boolean>(r => (set_should_stay_inserted = r));
    this.#revert_fns.push(() => set_should_stay_inserted?.(false));
    insert_surfaces({
      surfaces: [{ elements: els, should_stay_inserted }],
      verb: this.append_instead_of_replace_ ? "append" : "after",
      target: this.selector_,
      preserve_elements: true,
      remove_after_navigation: false,
      try_forever: true,
    });
    const first_element_found = new Promise<void>(r => {
      this.#disconnect_observer = observer.onexists<HTMLElement>(this.selector_, ({ element, disconnector }) => {
        r();
        if (this.append_instead_of_replace_) {
          disconnector();
          return;
        }
        const { style } = element;
        const old_display_value = style.display;
        style.setProperty("display", "none", "important");
        this.#revert_fns.push(() => {
          style.display = old_display_value;
        });
      });
    });
    await first_element_found;
    const { title } = document;
    if (this.title_) {
      document.title = this.title_;
      this.#revert_fns.push(() => (document.title = title));
    }
    this.#empty_page_bugfix();
    this.dispatchEvent(new CustomEvent("open")); // we dispatch this once it's actually open
  }, "failed to open page");

  #empty_page_bugfix() {
    // Called when a "page" is "opened" using PageReplacer
    const on_maybe_popstate = catchify((what_happened?: "replaceState" | "pushState" | "popstate") => {
      if (what_happened !== "popstate") return;
      const cleaned_current_url = clean_url(location.href);
      if (!PageReplacer.#visited_urls.has(cleaned_current_url)) {
        /*
        What does this check do? Well, there's a bug without it where people end up on a page that they shouldn't see (i.e. a somewhat blank page).
        The culprit of that bug is: the browser remembers where to make "hard"-navigations (i.e. a full document rebuild with a new `document` and `window` object) when going back and forwards in the history and where to just change the url. What it doesn't always correctly remember (observed in at least chrome and firefox), is *what document to hard-navigate to*. Therefore, we have to jump in and take care of that.
        The reproduction is this:
          Spendrups has set up a search page for us under /start/search. We don't want to hard-reload the page though to get there.
          1. Go to a product page like https://ehandel.spendrups.se/Product/1104201
          2. Make a search
          We use PageReplacer to just replace the current page (and the url in the address bar) with the search page. The thing is though, that when going back now the URL just updates but the browser doesn't actually navigate - that's fine, PageReplacer will just restore the old page contents
          3. Try going back just for fun
          Everything works as expected
          4. Go forwards again (just for fun, skip this if you skipped 3)
          Now the trouble comes when we introduce "hard" navigation.
          5. Click on a search result. The browser will now "hard" navigate to a new page.
          6. Click "back"
          What happens now, is that the browser hard-navigates to /start/search.
          7. Click "back" again
          What happens now, is that the browser "soft-navigates" (just changes the URL) to https://ehandel.spendrups.se/Product/1104201
          PageReplacer unload itself and reveals the original document - it is expected to be the one under https://ehandel.spendrups.se/Product/1104201, but actually it is the one under /start/search - a white page.

        The fix: is to remember all pages that we have visited since the creation of `window` (we do that by having a static property on PageReplacer since we assume the PageReplacer source code will only exist once on the page and will be loaded at page load, the latter assumption might be wrong, but I hope not). If we get a "popstate" event (meaning back or forwards button, not new page being pushed) to an unknown page we reload.

         */

        dlog(
          "PageReplacer: ",
          cleaned_current_url,
          " hasn't been visited since document was created, reloading since we won't be able to show this page otherwise"
        );
        location.reload();
        PageReplacer.#reverting_permitted = false; // Disallow any reverting since we can't - it would flash a white page until the reload has finished.
        this.#unload(); // Call unload to "kill" the solid-js stuff quicker so that it stops updating - the user is expecting the next thing that happens to be a navigation to the actual page the URL says they're on.
      }
    });
    instant_exec_on_suspect_history_change.add(on_maybe_popstate);
    this.#revert_fns.push(() => instant_exec_on_suspect_history_change.delete(on_maybe_popstate)); // Don't run the bugfixer if there isn't a PageReplacer page open since I assume the bug only happens when going back from a PageReplace'd page
  }

  /**
   * Stops listening to URL changes and closes the page (if it is currently open)
   */
  destroy_() {
    this.#unload();
    this.#stop_listening?.();
  }

  constructor({
    is_spa_,
    ...options
  }: Omit<PageReplacer, "destroy_" | "addEventListener" | "removeEventListener" | "dispatchEvent" | "open_"> & {
    is_spa_?: boolean;
  }) {
    super();
    Object.assign(this, options);
    this.#listen().catch(e => report([e, "Error listening to URL change"], "error"));
    if (!is_spa_) {
      setup_fast_leave(this); // Make so that clicking on links to the previous page work instantly
    }
  }
}

/**
 * Remove hash from URL
 */
function clean_url(url: string) {
  // Would want to have this a static private function on PageReplacer, but that's not supported in MobileSafari yet
  // remove hash, all other params *could* trigger a re-request
  const url_object = new URL(url);
  url_object.hash = "";
  return url_object.href;
}
