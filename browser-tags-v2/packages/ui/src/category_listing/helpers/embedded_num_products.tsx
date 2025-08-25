/** @jsxImportSource solid-js */
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  JSX as solid_JSX,
  onCleanup,
  Setter,
  untrack,
} from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { category_title_type_symbol } from "./category_title_type";

/**
 * Embeds number of products between sort and filter buttons on mobile if possible, only supported for category pages right now. Pass it as category_title_ to Category.
 * Note: this will add an invisible element as first element in depict-search-page which will confuse the flex-gap SCSS mixin a bit so you'll get some extra spacing at the beginning of the search page
 * If you see “ResizeObserver loop limit exceeded”, this is probably doing it. More context here: https://depictaiworkspace.slack.com/archives/C02KVDZ8YHZ/p1667315647758829
 */
export const embedded_num_products = /*@__PURE__*/ (() => {
  const actual_function = ({
    make_product_count_,
    set_observed_results_filters_elements_,
    is_slim_,
    sort_and_filter_element_,
    extra_sort_and_filter_args_,
  }: {
    make_product_count_: () => solid_JSX.Element;
    set_observed_results_filters_elements_: Setter<solid_JSX.Element>;
    sort_and_filter_element_: Accessor<HTMLDivElement | undefined>;
    is_slim_: Accessor<boolean>;
    extra_sort_and_filter_args_: {
      get_extra_sorting_button_?: (extra_button: solid_JSX.Element) => unknown;
      get_extra_filters_button_?: (extra_button: solid_JSX.Element) => unknown;
      sort_button_width_?: Accessor<number | undefined>;
      filter_button_width_?: Accessor<number | undefined>;
    };
  }) => {
    // this does two things: make the sorting and filters button the same width and move the number of products out of the SortAndFilter middle_elements_ if it doesn't fit
    let extra_sort_button_: HTMLElement;
    let extra_filter_button_: HTMLElement;
    const [only_show_filters_opener_, set_only_show_filters_opener] = createSignal(true);
    const embedded_product_count = make_product_count_();
    const [middle_elements_, set_middle_elements] = createSignal<solid_JSX.Element>(embedded_product_count);
    const [sort_button_width_, set_sort_button_width] = createSignal<number>();
    const [filter_button_width_, set_filter_button_width] = createSignal<number>();
    const extra_count = make_product_count_() as HTMLElement;
    [extra_count, embedded_product_count].forEach(el => ((el as HTMLDivElement).style.whiteSpace = "nowrap"));
    extra_sort_and_filter_args_.get_extra_filters_button_ = button => (extra_filter_button_ = button as HTMLElement); // ugly assumption, I wrote a comment in OpenSortingButton and OpenFiltersButton about it
    extra_sort_and_filter_args_.get_extra_sorting_button_ = button => (extra_sort_button_ = button as HTMLElement);
    extra_sort_and_filter_args_.filter_button_width_ = filter_button_width_;
    extra_sort_and_filter_args_.sort_button_width_ = sort_button_width_;

    const on_filters_constructed_ = () => {
      const active_sort_and_filter_element = untrack(sort_and_filter_element_); // We assume that this doesn't change which it currently doesn't after the filters have been constructed
      const extra_sort_and_filter_container_ = (
        <div
          class="sort-and-filter-buttons fake"
          aria-hidden="true"
          style="position:absolute;z-index:-1;pointer-events:none;opacity:0"
        >
          <div class="outer">
            <div class="inner">
              {extra_filter_button_}
              {extra_count}
              {extra_sort_button_}
            </div>
          </div>
        </div>
      );
      set_observed_results_filters_elements_(extra_sort_and_filter_container_);
      const [total_available_width, set_total_available_width] = createSignal<number>();
      const [filter_button_required_width, set_filter_button_required_width] = createSignal<number>();
      const [sort_button_required_width, set_sort_button_required_width] = createSignal<number>();
      const [count_required_width, set_count_required_width] = createSignal<number>();
      const larger_button_width = createMemo(
        () => Math.max(sort_button_required_width()!, filter_button_required_width()!) as number // might be NaN
      );
      const calculated_required_width = createMemo(
        () => count_required_width()! + larger_button_width()! * 2 // might be NaN
      );
      const observe_to_signal = (element: HTMLElement, setter: Setter<number | undefined>) => {
        const computed_style = getComputedStyle(element);
        const resize_observer = new ResizeObserver(
          catchify(() => {
            setter(
              element.getBoundingClientRect().width +
                parseFloat(computed_style.marginLeft) +
                parseFloat(computed_style.marginRight) +
                parseFloat(computed_style.borderRightWidth) +
                parseFloat(computed_style.borderLeftWidth)
            );
          })
        );
        resize_observer.observe(element);
        onCleanup(() => resize_observer.disconnect());
      };
      observe_to_signal(active_sort_and_filter_element!, set_total_available_width);
      observe_to_signal(extra_filter_button_, set_filter_button_required_width);
      observe_to_signal(extra_sort_button_, set_sort_button_required_width);
      observe_to_signal(extra_count, set_count_required_width);
      createEffect(() => {
        if (!is_slim_()) {
          set_middle_elements();
          return;
        }
        const required = calculated_required_width();
        const available = total_available_width();
        if (isNaN(required) || isNaN(available!)) {
          return;
        }
        const fits = required <= available!;
        // move things in / out of inbetween the filter buttons depending on if it fits
        set_only_show_filters_opener(fits);
        set_middle_elements(fits && embedded_product_count);
      });
      createEffect(() => {
        const biggest_size = larger_button_width();
        // set smaller button to be size of largest button
        if (isNaN(biggest_size)) {
          return;
        }
        if (sort_button_required_width() === biggest_size) {
          set_sort_button_width();
          set_filter_button_width(biggest_size);
        } else {
          set_filter_button_width();
          set_sort_button_width(biggest_size);
        }
      });
    };
    return { only_show_filters_opener_, middle_elements_, on_filters_constructed_ };
  };
  (actual_function as any)[category_title_type_symbol] = "interactive";
  return actual_function;
})();
