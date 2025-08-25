/** @jsxImportSource solid-js */
import { Accessor, batch, createComputed, createSignal, onCleanup, Show, Signal, untrack } from "solid-js";
import { SortModel } from "@depict-ai/types/api/SearchResponse";
import { catchify, javascript_media_query, observer } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { is_showing_toast } from "../../helper_functions/show_toast";
import { on_viewport_move } from "../../helper_functions/on_viewport_move";
import { FilterIcon } from "../icons/FilterIcon";
import { SortIconAsc } from "../icons/SortIconAsc";
import { SortIconDesc } from "../icons/SortIconDesc";
import { ArrowUp } from "../icons/ArrowUp";
import { isServer } from "solid-js/web";

type Props = {
  search_filters_open_: Signal<boolean>;
  search_sorting_open_: Signal<boolean>;
  sort_and_filter_element_: Accessor<HTMLDivElement | undefined>;
  current_sorting_: Signal<SortModel | undefined>;
  i18n_: solid_plp_shared_i18n;
};

export function FloatingButtons(props: Props) {
  if (isServer) return; // won't show in initial render and need scroll position

  const [is_small, set_is_small] = createSignal(true);
  onCleanup(javascript_media_query("(max-width:651px)", ({ matches }) => set_is_small(matches)).remove);

  return <Show when={is_small()}>{ActualFloatingButtons(props)}</Show>;
}

function ActualFloatingButtons({
  search_filters_open_: [get_search_filters_open_, set_search_filters_open_],
  search_sorting_open_: [get_search_sorting_open_, set_search_sorting_open_],
  current_sorting_,
  sort_and_filter_element_,
  i18n_,
}: Props) {
  let old_pos = scrollY;
  let diff_over_second_or_touch = 0; // for things not supporting touch events
  let timeout: ReturnType<typeof setTimeout>;
  let inertia_timeout: ReturnType<typeof setTimeout> | undefined;
  let is_in_touch_scroll = false;
  let direction_up = false;
  let resolve_cleanup_promise: VoidFunction;
  const cleanup_promise = new Promise<void>(r => (resolve_cleanup_promise = r));
  const [is_scrolling_upwards, set_is_scrolling_upwards] = createSignal(false);
  const [get_is_showing_toast] = is_showing_toast;
  const [modal_is_closed, set_if_modal_is_closed] = createSignal(
    !untrack(get_search_filters_open_) && !untrack(get_search_sorting_open_)
  );
  const [regular_buttons_are_in_view, set_regular_buttons_are_in_view] = createSignal(false);

  const handle_scrollpos_change = () =>
    untrack(() => {
      const new_pos = scrollY;
      if (modal_is_closed()) {
        const diff = new_pos - old_pos;
        const new_direction = diff < 0;
        if (direction_up !== new_direction) {
          // direction changed, reset diff
          diff_over_second_or_touch = 0;
        }
        direction_up = new_direction;
        diff_over_second_or_touch += diff;
        if (!is_in_touch_scroll) {
          // touch not supported or scrolled without touching screen i.e. with keyboard
          setTimeout(() => (diff_over_second_or_touch -= diff), 1000); // I think error handling is not worth the overhead here
        }
        if (diff_over_second_or_touch < -50) {
          set_is_scrolling_upwards(true);
        } else if (diff_over_second_or_touch > 30) {
          set_is_scrolling_upwards(false);
        }
      }
      old_pos = new_pos;
    });

  const touchstart_handler = catchify((e: TouchEvent) => {
    is_in_touch_scroll = true;
    if (e.touches.length === 1) {
      // we had no touches but then we got some. Adding a new touch cancels the inertia. We are in a new touch so do reset the diff
      clearTimeout(inertia_timeout);
      diff_over_second_or_touch = 0;
    }
  });
  const touchend_handler = catchify((e: TouchEvent) => {
    if (e.touches.length === 0) {
      // scroll gesture of any type (pinch can also be used as scroll, etc.) ended
      inertia_timeout = setTimeout(
        // inertia ends after 500ms (educated guess)
        catchify(() => {
          is_in_touch_scroll = false;
          diff_over_second_or_touch = 0;
        }),
        500
      );
    }
  });
  addEventListener("touchstart", touchstart_handler);
  addEventListener("touchend", touchend_handler);
  onCleanup(() => {
    removeEventListener("touchstart", touchstart_handler);
    removeEventListener("touchend", touchend_handler);
  });

  on_viewport_move(handle_scrollpos_change);

  onCleanup(resolve_cleanup_promise!);

  createComputed(() => {
    clearTimeout(timeout);
    const everything_closed = !get_search_filters_open_() && !get_search_sorting_open_();
    if (!untrack(modal_is_closed) && everything_closed) {
      // I think the point of this is to delay the animation a bit IIRC
      timeout = setTimeout(
        catchify(() => set_if_modal_is_closed(true)),
        200
      );
    } else {
      set_if_modal_is_closed(everything_closed);
    }
  });

  createComputed(
    catchify(async () => {
      const element = sort_and_filter_element_();
      if (!element) {
        return;
      }
      await observer.wait_for_element(element);
      const is = new IntersectionObserver(records =>
        batch(() => {
          for (const record of records) {
            set_regular_buttons_are_in_view(record.isIntersecting);
          }
        })
      );
      is.observe(element);
      await cleanup_promise;
      is.disconnect();
    })
  );

  return (
    <div
      class="floating-buttons"
      classList={{
        "show-them":
          is_scrolling_upwards() && modal_is_closed() && !regular_buttons_are_in_view() && !get_is_showing_toast(),
      }}
    >
      <button
        class="filter"
        aria-label={i18n_.filter_text_()}
        onClick={catchify(() => {
          set_search_filters_open_(true);
          set_search_sorting_open_(false);
        })}
      >
        <div>
          <FilterIcon />
        </div>
      </button>
      <button
        class="sort"
        aria-label={i18n_.sorting_text_()}
        onClick={catchify(() => {
          set_search_filters_open_(false);
          set_search_sorting_open_(true);
        })}
      >
        <div>{current_sorting_[0]()?.order === "asc" ? <SortIconAsc /> : <SortIconDesc />}</div>
      </button>
      <button
        class="up"
        aria-label={i18n_.scroll_to_top_()}
        onClick={catchify(() => scrollTo({ top: 0, behavior: "smooth" }))}
      >
        <div>
          <ArrowUp />
        </div>
      </button>
    </div>
  );
}
