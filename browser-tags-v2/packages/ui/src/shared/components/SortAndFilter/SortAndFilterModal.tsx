/** @jsxImportSource solid-js */
import { Accessor, createComputed, createSignal, onCleanup, Show, Signal, untrack } from "solid-js";
import { catchify, dlog, Elem, observer } from "@depict-ai/utilishared";
import { MorphingSign } from "../MorphingSign";
import { SortBody } from "./SortBody";
import { FilterBody } from "./FilterBody";
import { disable_scrolling } from "../../../search/helper_functions/disable_scrolling";
import { ExpandingDetails } from "../ExpandingDetails";
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { revertably_clear_filters } from "../../helper_functions/revertably_clear_filters";
import { CrossIcon } from "../icons/CrossIcon";
import { SortIconAsc } from "../icons/SortIconAsc";
import { SortIconDesc } from "../icons/SortIconDesc";
import { FilterIcon } from "../icons/FilterIcon";
import { should_hide_filtering } from "../../helper_functions/should_hide_filtering";

const no_go_selector = ".range .range-group";

export function SortAndFilterModal({
  args_for_sorting_,
  args_for_filtering_,
  search_filters_open_: [get_search_filters_open, set_search_filters_open],
  search_sorting_open_: [get_search_sorting_open, set_search_sorting_open],
  dismiss_modal_,
  register_closing_animation_,
  formatted_number_of_results_,
  i18n_,
}: {
  args_for_sorting_: Parameters<typeof SortBody>[0];
  args_for_filtering_: Parameters<typeof FilterBody>[0];
  search_filters_open_: Signal<boolean>;
  search_sorting_open_: Signal<boolean>;
  register_closing_animation_: (animation: () => Promise<any>) => void;
  dismiss_modal_: VoidFunction;
  i18n_: solid_plp_shared_i18n & { show_n_results_: Accessor<(number_of_results: HTMLElement) => Elem[]> };
  formatted_number_of_results_: Accessor<string>;
}) {
  disable_scrolling();

  let modal: HTMLDivElement;
  let modal_body: HTMLDivElement;
  let background: HTMLDivElement;
  let dismiss_button: HTMLButtonElement;
  let resolve_cleanup_promise: VoidFunction | undefined;
  let touches = 0;

  const cleanup_promise = new Promise<void>(r => (resolve_cleanup_promise = r));
  const [sorting_expanded, set_sorting_expanded] = createSignal(untrack(() => get_search_sorting_open()));
  const [filters_expanded, set_filters_expanded] = createSignal(untrack(() => get_search_filters_open()));
  const modal_scrolling_prevented = createSignal(false);

  // Note: we're not using Element.animate here because it's completely broken for animating the modal up-down on iOS 15.4 (I debugged it for three hours and then just updated) and still a bit glitchy on other versions. Might be possible to switch now for later versions but probably not worth it

  const set_style = (el: HTMLElement, property: string, value: string) => el.style.setProperty(property, value);
  const set_background_style = (property: string, value: string) => set_style(background, property, value);
  const set_modal_style = (property: string, value: string) => set_style(modal, property, value);
  const set_button_style = (property: string, value: string) => set_style(dismiss_button, property, value);
  const set_button_fraction_in = (fraction: number) =>
    set_button_style(
      "transform",
      `translateY(calc(calc(-100% - ${getComputedStyle(dismiss_button).top}) * ${1 - fraction}))`
    );

  // sync what was open if possible for when switching mobile/desktop or navigating away and coming back
  createComputed(() => {
    const filtering_collapsible_expanded = filters_expanded();
    const sorting_collapsible_expanded = sorting_expanded();
    if (filtering_collapsible_expanded && !sorting_collapsible_expanded) {
      set_search_filters_open(true);
      set_search_sorting_open(false);
    } else if (sorting_collapsible_expanded && !filtering_collapsible_expanded) {
      set_search_filters_open(false);
      set_search_sorting_open(true);
    }
  });

  onCleanup(
    catchify(() => {
      if (!sorting_expanded() && !filters_expanded()) {
        set_search_filters_open(false);
        set_search_sorting_open(false);
      }
    })
  );

  register_closing_animation_(() => {
    set_background_style("transition", "all 300ms ease-out");
    set_background_style("opacity", "0");
    set_modal_style("transition", "all 200ms ease-out");
    set_modal_style("transform", "translateY(100%)");
    set_button_style("transition", "all 100ms ease-out");
    set_button_fraction_in(0);
    return new Promise(r => setTimeout(r, 300));
  });

  onCleanup(resolve_cleanup_promise!);

  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      dismiss_modal_();
    }
  };
  addEventListener("keydown", handler);
  onCleanup(() => removeEventListener("keydown", handler));

  return [
    (
      <div class="depict plp" id="depict-filter-sort-mobile-modal-container">
        <div
          class="depict-filter-sort-modal-backdrop"
          onClick={dismiss_modal_}
          ref={el => {
            background = el;
            observer.wait_for_element(el).then(
              catchify(() => {
                set_background_style("transition", "all 200ms ease-in");
                // For some reason this needs a requestAnimationFrame but the other modal-opening animations don't
                requestAnimationFrame(catchify(() => set_background_style("opacity", "1")));
              })
            );
          }}
        ></div>

        <button
          onClick={dismiss_modal_}
          class="dismiss-modal"
          aria-label={i18n_.close_()}
          ref={el => {
            dismiss_button = el;
            observer.wait_for_element(el).then(
              catchify(() => {
                set_button_style("transition", "all 200ms ease-in");
                set_button_fraction_in(1);
              })
            );
          }}
        >
          <CrossIcon />
        </button>
        <div
          class="filter-sort-modal"
          ref={el => {
            modal = el;
            observer.wait_for_element(el).then(
              catchify(() => {
                set_modal_style("transition", "all 200ms ease-in");
                set_modal_style("transform", "translateY(0)");
              })
            );
          }}
          onTouchStart={({ changedTouches, target }) => {
            // touchstart should always only have one changed touch, track it here
            if (touches >= 1) {
              dlog("Got new touch", changedTouches, "ignoring"); // only support 1 touch for now
              return;
            }
            if (target.closest(no_go_selector) || target.matches(no_go_selector)) {
              dlog("Got touch on slider, ignoring for UX", target, changedTouches);
              return;
            }
            set_modal_style("transition", "unset");
            set_background_style("transition", "unset");
            set_button_style("transition", "unset");
            const [{ identifier: our_fingers_identifier, pageY: start_page_y }] = changedTouches;
            let gesture_starting_page_y = start_page_y;
            const start_time = +new Date();
            let total_distance_travelled = 0;
            let last_move_page_y = start_page_y;
            let first_move_was_downwards = false;
            let distance_from_start_of_gesture = 0;
            const end_handler = catchify((e?: TouchEvent) => {
              const changedTouches = e?.changedTouches;
              if (changedTouches && changedTouches[0].identifier !== our_fingers_identifier) {
                // other finger stopped touch, ignore it
                return;
              }
              modal_scrolling_prevented[1](false);
              const velocity = total_distance_travelled / (+new Date() - start_time); // px/ms
              const { offsetHeight } = modal;
              if (
                (e?.type === "touchend" && distance_from_start_of_gesture > offsetHeight / 3) ||
                (velocity > 1.5 && distance_from_start_of_gesture > offsetHeight / 10) // I think this is a good magic number
              ) {
                dismiss_modal_();
              } else if (e) {
                set_background_style("transition", "all 150ms ease-out");
                set_background_style("opacity", "1");
                set_modal_style("transition", "all 150ms ease-out");
                set_modal_style("transform", "translateY(0)");
                set_button_style("transition", "all 100ms ease-out");
                set_button_fraction_in(1);
              }
              touches--;
              modal.removeEventListener("touchend", end_handler);
              modal.removeEventListener("touchcancel", end_handler);
              modal.removeEventListener("touchmove", move_handler);
            });
            const move_handler = catchify((e: TouchEvent) => {
              const { changedTouches } = e;
              let called_prevent_default = false;
              for (let i = 0; i < changedTouches.length; i++) {
                const { pageY: this_move_page_y, clientY, identifier: identifier_of_a_touch } = changedTouches[i];
                // unrelated to this functionality, we want to block that the site behind is being scrolled when swiping on this if the modal isn't scrollable
                const scroll_top_max =
                  (modal_body as { scrollTopMax?: number }).scrollTopMax ||
                  modal_body.scrollHeight - modal_body.clientHeight;
                if (scroll_top_max === 0) {
                  e.preventDefault();
                  called_prevent_default = true;
                }
                // end unrelated
                if (identifier_of_a_touch !== our_fingers_identifier) {
                  continue;
                }
                if (modal_body.scrollTop > 0) {
                  gesture_starting_page_y = this_move_page_y;
                  return;
                }
                total_distance_travelled += Math.abs(this_move_page_y - last_move_page_y);
                distance_from_start_of_gesture = this_move_page_y - gesture_starting_page_y;
                if (!first_move_was_downwards) {
                  if (distance_from_start_of_gesture < 0) {
                    // user wants to scroll down, end it
                    end_handler();
                    return;
                  } else {
                    first_move_was_downwards = true;
                  }
                }
                if (distance_from_start_of_gesture > 0) {
                  modal_scrolling_prevented[1](true);
                } else {
                  modal_scrolling_prevented[1](false);
                }
                if (!called_prevent_default) {
                  e.preventDefault();
                }
                set_modal_style("transform", `translateY(${distance_from_start_of_gesture}px)`);
                set_background_style("opacity", 1 - clientY / window.innerHeight / 2 + "");
                const on_way_to_snap_point = distance_from_start_of_gesture / (modal.offsetHeight / 3);
                set_button_fraction_in(
                  1 - (on_way_to_snap_point < 0 ? 0 : on_way_to_snap_point > 1 ? 1 : on_way_to_snap_point)
                );
                last_move_page_y = this_move_page_y;
              }
            });

            modal.addEventListener("touchend", end_handler);
            modal.addEventListener("touchcancel", end_handler);
            modal.addEventListener("touchmove", move_handler, { passive: false });
            touches++;
          }}
        >
          <div class="body" ref={modal_body!} style={modal_scrolling_prevented[0]() ? "overflow:hidden" : ""}>
            <ExpandingDetails
              is_open_={[sorting_expanded, set_sorting_expanded]}
              details_={(<details class="sorting" />) as HTMLDetailsElement}
              summary_={
                (
                  <summary class="sort-filter-summary">
                    <div class="summary">
                      <div class="left-els">
                        {args_for_sorting_.current_sorting_[0]()?.order === "asc" ? <SortIconAsc /> : <SortIconDesc />}
                        <span>{i18n_.sorting_text_()}</span>
                      </div>
                      <MorphingSign expanded_={sorting_expanded} i18n_={i18n_} />
                    </div>
                  </summary>
                ) as HTMLElement
              }
            >
              {
                (
                  <div class="body">
                    <SortBody {...args_for_sorting_} />
                  </div>
                ) as HTMLDivElement
              }
            </ExpandingDetails>
            <Show when={!should_hide_filtering(args_for_filtering_)}>
              <ExpandingDetails
                is_open_={[filters_expanded, set_filters_expanded]}
                details_={(<details class="filters" />) as HTMLDetailsElement}
                summary_={
                  (
                    <summary class="sort-filter-summary">
                      <div class="summary">
                        <div class="left-els">
                          <FilterIcon />
                          <span>{i18n_.filters_()}</span>
                        </div>
                        <MorphingSign expanded_={filters_expanded} i18n_={i18n_} />
                      </div>
                    </summary>
                  ) as HTMLElement
                }
              >
                {
                  (
                    <div class="body">
                      <FilterBody {...args_for_filtering_} are_in_modal_={true} />
                    </div>
                  ) as HTMLDivElement
                }
              </ExpandingDetails>
            </Show>
          </div>
          <div class="bottom-row">
            <Show when={args_for_filtering_.selected_filters_[0]()?.length}>
              <button
                class="clear minor"
                onClick={catchify(() => {
                  const show_toast = revertably_clear_filters({
                    user_triggered_: true,
                    expanded_hierarchical_filters_: args_for_filtering_.expanded_hierarchical_filters_,
                    i18n_,
                    local_filter_cache_: args_for_filtering_.local_filter_cache_,
                    selected_filters_: args_for_filtering_.selected_filters_,
                    also_clear_sorting_: false,
                    delay_toast_: true,
                  });
                  cleanup_promise.then(catchify(show_toast!));
                })}
              >
                {i18n_.clear_individual_filter_()}
              </button>
            </Show>
            <button class="show-results major" onClick={dismiss_modal_}>
              {i18n_.show_n_results_()((<b>{formatted_number_of_results_()}</b>) as HTMLElement)}
            </button>
          </div>
        </div>
      </div>
    ) as HTMLDivElement,
  ];
}
