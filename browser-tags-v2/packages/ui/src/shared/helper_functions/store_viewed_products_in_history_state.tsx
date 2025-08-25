import { Accessor, createComputed, getOwner, onCleanup, runWithOwner, Signal, untrack } from "solid-js";
import { catchify, dwarn, report } from "@depict-ai/utilishared";
import { ScrollRestorationData } from "../types";
import { ProductListingResponseAfterDisplayTransformer } from "../../category_listing/types";
import { SearchResponseAfterDisplayTransformer } from "../../search/types";

const max_history_change_frequency = 300;
const api_max_products_per_request = 100;

export function store_viewed_products_in_history_state({
  scroll_restoration_data_: [, set_scroll_restoration_data],
  last_result_in_viewport_: [get_last_result_in_viewport_],
  id_,
  can_write_scroll_restoration_,
}: {
  last_result_in_viewport_: Signal<number | undefined>;
  scroll_restoration_data_: Signal<ScrollRestorationData>;
  id_: Accessor<string>;
  can_write_scroll_restoration_: Accessor<boolean>;
}) {
  // store last actually seen (within viewport) product in history.state
  let last_time_history_changed = 0;
  let set_to_later: undefined | number;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const set_min_results_loaded = (min_results_loaded: number) => {
    if (!untrack(can_write_scroll_restoration_)) {
      return;
    }
    set_scroll_restoration_data([{ for_id: untrack(id_), min_results_loaded }]); // get rid of old data the browser saves the old state and will restore it later on
  };

  createComputed(
    catchify(() => {
      const last_result = get_last_result_in_viewport_();
      if (last_result == undefined || last_result <= 0 || last_result == Infinity) return;
      if (isNaN(last_result)) {
        // if last_result is NaN there's an issue somewhere, but if we store something here that's not a number the for loop further down will break, and we won't be able to load results at all, so let's just continue
        report(new Error("last_result is NaN, this should not happen"), "error", { last_result });
        return;
      }

      // We can push to history.state max 100 times per 30 seconds (Safari) so we have to debounce/cap this at 300ms for aggressive scrolling.
      // Pushing to history.state right before we leave the page (onunload etc.) is unreliable, as it has to occur *before* the next page is pushed to history.
      // Instead, we delay our push with a timeout set to the next acceptable interval to the previous one, when necessary
      const now = +new Date();
      const time_since_last_ran = now - last_time_history_changed;

      if (time_since_last_ran > max_history_change_frequency) {
        // If the interval to the previous push is already long enough, it's fine to push the next value directly.
        set_min_results_loaded(last_result);
        last_time_history_changed = now;

        // Even though the interval has passed, there could still be a delayed push timeout in flight (browser can delay timeouts at will).
        // We've already written the guaranteed-to-be-freshest value so we can just cancel it.
        clearTimeout(timeout);
        return;
      }

      set_to_later = last_result;
      // If a delayed push timeout is already running, just changing the value that will be pushed is sufficient
      if (timeout) return;

      timeout = setTimeout(
        catchify(() => {
          timeout = undefined;
          last_time_history_changed = +new Date();
          set_min_results_loaded(set_to_later!);
        }),
        max_history_change_frequency - time_since_last_ran
      );
    })
  );
  onCleanup(() => clearTimeout(timeout)); // could cause weird bugs otherwise
}

export async function request_first_products_with_scroll_restoration<
  T extends (ProductListingResponseAfterDisplayTransformer | SearchResponseAfterDisplayTransformer) & { failed?: true },
>({
  scroll_restoration_data_: [get_scroll_restoration_data],
  make_request_,
  min_products_to_fetch_,
  id_,
}: {
  scroll_restoration_data_: Signal<ScrollRestorationData>;
  make_request_: (limit_: number, cursor?: string) => Promise<T>;
  min_products_to_fetch_: number;
  id_: string;
}) {
  const to_fetch_according_to_state =
    untrack(get_scroll_restoration_data).find(({ for_id }) => for_id === id_)?.min_results_loaded ?? 0;
  const total_products_to_fetch =
    to_fetch_according_to_state < min_products_to_fetch_ ? min_products_to_fetch_ : to_fetch_according_to_state + 20; // if we fetch according to state, fetch some more in case that the screen size increased, there's some in-accuracy or for the user to scroll. Sometimes the load more post processor will trigger to fetch more after this, but I think that's ok.
  if (total_products_to_fetch <= api_max_products_per_request) {
    return await make_request_(total_products_to_fetch);
  }

  const displays: T["displays"] = [];
  const owner = getOwner();
  let last_response: T;
  let next_cursor: string | undefined;

  for (let fetch_this_time = api_max_products_per_request; displays.length < total_products_to_fetch; ) {
    // Carry over the request when making the owner so that display transformers can use onCleanup
    last_response = await runWithOwner(owner, () => make_request_(fetch_this_time, next_cursor))!;
    const new_displays = last_response.displays;
    displays.push(...new_displays);
    next_cursor = last_response.cursor;
    const left_to_fetch = total_products_to_fetch - displays.length;

    if (!next_cursor) {
      if (left_to_fetch > 0) {
        dwarn(
          "Got response without a cursor when attempting to restore scroll position, giving up",
          last_response,
          total_products_to_fetch,
          displays
        );
      }
      // Backend ran out of displays, or we failed to fetch. Since DepictAPI uses fetch_retry we've already made 10 attempts, so we just give up at this point
      break;
    }

    fetch_this_time = left_to_fetch < api_max_products_per_request ? left_to_fetch : api_max_products_per_request;
  }

  return { ...last_response!, displays };
}
