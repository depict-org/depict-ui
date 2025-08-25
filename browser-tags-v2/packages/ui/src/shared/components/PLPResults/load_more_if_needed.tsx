import { Accessor, createComputed, createEffect, createSignal, on, Resource, Setter, Signal, untrack } from "solid-js";
import { DepictAPI } from "../../DepictAPI";
import { catchify, Display } from "@depict-ai/utilishared";
import { ProductListingResponseV3 } from "@depict-ai/types/api/ProductListingResponseV3";
import { BaseQueryAccessor } from "../../types";
import { SearchResponseAfterDisplayTransformer } from "../../../search/types";

export function load_more_if_needed<T extends Display>({
  percentage_in_view_,
  set_extra_displays_,
  all_products_loaded_,
  plp_results_,
  min_products_to_fetch_,
  query_base_,
  depict_api_,
}: {
  percentage_in_view_: Accessor<number>;
  set_extra_displays_: Setter<T[]>;
  all_products_loaded_: Signal<boolean>;
  plp_results_: Resource<SearchResponseAfterDisplayTransformer | ProductListingResponseV3 | undefined>;
  min_products_to_fetch_: number;
  query_base_: BaseQueryAccessor;
  depict_api_: DepictAPI<T>;
}) {
  let last_loaded = +new Date();
  let is_loading_more = false;
  let is_first_load = true;
  const [get_last_cursor, set_last_cursor] = createSignal<string | undefined>();
  createComputed(on(plp_results_, () => set_extra_displays_([]), { defer: true })); // empty array when a new request has completed (don't run this initially since it will already be empty)
  createComputed(() => {
    set_last_cursor(plp_results_()?.cursor);
    last_loaded = +new Date();
    is_first_load = true;
  });

  // percentage_in_view_ has equals: false so it should update even when set to the same value. That is to make sure that if the user bounces around below the "viewport" of our product listing we still start fetching as soon as is_loading_more becomes false again and we get IntersectionObserverEntries
  createEffect(
    catchify(async () => {
      const be_above_percentage = is_first_load ? 50 : 75; // if first load, load earlier
      if (percentage_in_view_() < be_above_percentage || is_loading_more) return;
      if (!get_last_cursor()) {
        // dlog("All results loaded, can't load more");
        all_products_loaded_?.[1](true); // This is unset in SearchPage as we start fetching new results
        return;
      }
      // dlog("More than ", be_above_percentage, "% in view, ", percentage_in_view_(), "%, loading more");
      is_loading_more = true;

      const base_part = untrack(query_base_);
      const now = +new Date();
      // load faster if someone is scrolling aggressively
      const number_of_results_to_load = is_first_load
        ? // After first load, always just load 20 since people might just be browsing the top ones still
          min_products_to_fetch_
        : now - last_loaded < 10000
        ? min_products_to_fetch_ * 5
        : min_products_to_fetch_;
      // dlog("loading ", number_of_results_to_load, "products, because it was", now - last_loaded, "ms since last load");
      const api_response = await depict_api_[
        "query" in base_part ? ("query" as const) : ("get_listing_products" as const)
      ]({
        cursor: get_last_cursor(),
        limit: number_of_results_to_load,
        ...base_part,
      } as any);

      const new_displays = (api_response?.displays || []) as T[];
      set_extra_displays_(old_value => {
        // We want this to go fast. The apply method is the fastest way to add to an array, and AFAIK it's faster to add than to create a new one.
        // eslint-disable-next-line prefer-spread
        old_value.push.apply(old_value, new_displays);
        return old_value;
      });
      set_last_cursor(api_response.cursor);
      is_loading_more = false;
      last_loaded = +new Date();
      is_first_load = false;
    })
  );
}
