/** @jsxImportSource solid-js */
import {
  Accessor,
  batch,
  createComputed,
  createEffect,
  createMemo,
  JSX as solid_JSX,
  Setter,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { SearchFilter, SortModel } from "@depict-ai/types/api/SearchResponse";
import { catchify, Elem } from "@depict-ai/utilishared";
import { modal_opener } from "../../../search/helper_functions/modal_opener";
import { FilterBody } from "./FilterBody";
import { SortBody } from "./SortBody";
import { SortAndFilterModal } from "./SortAndFilterModal";
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { SentryErrorBoundary } from "../SentryErrorBoundary";
import { create_modified_filters } from "./FilterBody/create_modified_filters";
import { SortMeta } from "@depict-ai/types/api/SearchRequestV3";
import { MinusIcon } from "../icons/MinusIcon";
import { FilterIcon } from "../icons/FilterIcon";
import { SortIconAsc } from "../icons/SortIconAsc";
import { SortIconDesc } from "../icons/SortIconDesc";
import { isServer } from "solid-js/web";
import { should_hide_filtering } from "../../helper_functions/should_hide_filtering";
import { media_query_to_accessor } from "../../helper_functions/media_query_to_accessor";

export function SortAndFilter({
  current_sorting_,
  set_extra_els_in_results_container_,
  search_filters_open_,
  search_sorting_open_,
  set_sort_or_filter_open_,
  i18n_,
  available_sortings_,
  available_filters_,
  expanded_filters_,
  middle_elements_,
  input_modal_open_,
  expanded_hierarchical_filters_,
  number_of_rendered_selected_filters_items_,
  set_sort_and_filter_element_,
  sort_and_filter_disabled_,
  formatted_number_of_results_,
  filter_button_width_,
  sort_button_width_,
  selected_filters_,
  local_filter_cache_,
  get_extra_filters_button_,
  get_extra_sorting_button_,
  filterModalParent_,
  hideCount0FilterOptions_,
  switchToFiltersDrawerBreakpoint_,
}: {
  search_filters_open_: Signal<boolean>;
  number_of_rendered_selected_filters_items_: Signal<number>;
  search_sorting_open_: Signal<boolean>;
  set_extra_els_in_results_container_: Setter<solid_JSX.Element>;
  set_sort_or_filter_open_: Setter<boolean>;
  i18n_: solid_plp_shared_i18n & { show_n_results_: Accessor<(number_of_results: HTMLElement) => Elem[]> };
  set_sort_and_filter_element_: Setter<HTMLDivElement | undefined>;
  available_sortings_: Accessor<SortModel[] | undefined>;
  available_filters_: Accessor<SearchFilter[] | undefined>;
  formatted_number_of_results_: Accessor<string>;
  input_modal_open_?: Accessor<boolean>;
  expanded_filters_: Signal<{ section_: string; expanded_: boolean }[]>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  selected_filters_: Signal<{ field: string; op: SearchFilter["op"]; data: any }[]>;
  local_filter_cache_: Signal<SearchFilter[]>;
  get_extra_sorting_button_?: (extra_button: solid_JSX.Element) => unknown;
  get_extra_filters_button_?: (extra_button: solid_JSX.Element) => unknown;
  sort_button_width_?: Accessor<number | undefined>;
  filter_button_width_?: Accessor<number | undefined>;
  middle_elements_?: Accessor<solid_JSX.Element>;
  current_sorting_: Signal<SortModel | undefined>;
  sort_and_filter_disabled_?: Accessor<boolean>;
  filterModalParent_?: HTMLElement | ShadowRoot; // Needed by style editor in shopify plugin
  hideCount0FilterOptions_: Accessor<boolean>;
  switchToFiltersDrawerBreakpoint_: Accessor<number | undefined>;
}) {
  const Self = () => {
    // This could technically be in SearchPage and CategoryPage and would be better suited there since it writes into local_filter_cache_ which i.e. SelectedFilters uses, but it's better suited here IMO due to DRY and being inside the correct error boundary here
    create_modified_filters({
      available_filters_,
      selected_filters_,
      local_filter_cache_,
    });

    const [filters_open, set_filters_open] = search_filters_open_;
    const [sorting_open, set_sorting_open] = search_sorting_open_;
    const [get_current_sorting_] = current_sorting_;
    const isSmall = createMemo(() =>
      media_query_to_accessor(`(max-width:${switchToFiltersDrawerBreakpoint_() ?? 651}px)`)
    );
    const dismiss_modal_ = catchify(() => {
      set_filters_open(false);
      set_sorting_open(false);
    });
    const meta_of_currently_selected_sorting_ = createMemo(
      () =>
        available_sortings_()?.find?.(({ field, order }) => {
          const current = get_current_sorting_();
          return current?.field === field && current?.order === order;
        })?.meta
    );
    const filter_options = {
      expanded_hierarchical_filters_,
      local_filter_cache_,
      available_filters_,
      expanded_filters_,
      selected_filters_,
      i18n_,
      hideCount0FilterOptions_,
    } as const;
    const hide_filters = createMemo(() => should_hide_filtering(filter_options));
    const sorting_options = { current_sorting_, available_sortings_, meta_of_currently_selected_sorting_ } as const;
    const make_open_filters_button = (adhere_to_width = false, is_tabbable = false) => (
      <OpenFiltersButton
        tabindex_={is_tabbable ? 0 : -1}
        i18n_={i18n_}
        search_filters_open_={search_filters_open_}
        search_sorting_open_={search_sorting_open_}
        number_of_rendered_selected_filters_items_={number_of_rendered_selected_filters_items_}
        filter_button_width_={adhere_to_width ? filter_button_width_ : undefined}
        hide_button_={hide_filters}
      />
    );
    const make_open_sorting_button = (adhere_to_width = false, is_tabbable = false) => (
      <OpenSortingButton
        tabindex_={is_tabbable ? 0 : -1}
        i18n_={i18n_}
        get_current_sorting_={get_current_sorting_}
        search_filters_open_={search_filters_open_}
        search_sorting_open_={search_sorting_open_}
        available_sortings_={available_sortings_}
        sort_button_width_={adhere_to_width ? sort_button_width_ : undefined}
        meta_of_currently_selected_sorting_={meta_of_currently_selected_sorting_}
      />
    );
    let open_modal_: (
      extra_options_for_modal?: {
        [key: string]: any;
      },
      on_dispose?: VoidFunction | undefined
    ) => void;
    let close_modal_: VoidFunction | undefined;
    let grid_is_in_original_state = true;

    createComputed(() => {
      const fi_o = filters_open();
      const so_o = sorting_open();
      const i_s = isSmall()();
      // we need to always read all the signal if we have them in the if-statement the value of it changes when the computation runs
      if ((fi_o || so_o) && !i_s) {
        if (!grid_is_in_original_state) {
          return;
        }
        set_sort_or_filter_open_(true);
        grid_is_in_original_state = false;
      } else if (!grid_is_in_original_state) {
        set_sort_or_filter_open_(false);
        grid_is_in_original_state = true;
      }
    });

    createEffect(() => {
      if (!filters_open() && !sorting_open()) {
        close_modal_?.();
        set_extra_els_in_results_container_("");
      } else if (isSmall()()) {
        if (untrack(() => input_modal_open_?.())) {
          // we don't want to shove another modal into the users face, silently close the filters for them
          set_filters_open(false);
          set_sorting_open(false);
          return;
        }
        open_modal_?.();
        set_extra_els_in_results_container_("");
      } else {
        close_modal_?.();
        if (filters_open()) {
          set_extra_els_in_results_container_(() => (
            <Show when={!hide_filters()}>
              <div class="filters">
                <div class="body">
                  <FilterBody {...filter_options} />
                </div>
              </div>
            </Show>
          ));
        } else {
          set_extra_els_in_results_container_(
            <div class="sorting">
              <div class="body">
                <SortBody {...sorting_options} />
              </div>
            </div>
          );
        }
      }
    });

    catchify(async () => {
      ({ open_modal_, close_modal_ } = await modal_opener(
        SortAndFilterModal,
        {
          args_for_sorting_: sorting_options,
          args_for_filtering_: filter_options,
          search_filters_open_,
          search_sorting_open_,
          formatted_number_of_results_,
          dismiss_modal_,
          i18n_,
        },
        filterModalParent_
      ));
    })();

    get_extra_filters_button_?.(make_open_filters_button());
    get_extra_sorting_button_?.(make_open_sorting_button());

    createEffect(() => {
      if (sort_and_filter_disabled_?.()) {
        // If someone changes the layout to slider-without-filters dynamically, close sorting and filters
        set_filters_open(false);
        set_sorting_open(false);
      }
    });

    return (
      // this element structure is duplicated in embedded_num_products
      <Show when={!sort_and_filter_disabled_?.()}>
        <div class="sort-and-filter-buttons" ref={set_sort_and_filter_element_}>
          <div class="outer">
            <div class="inner">
              {make_open_filters_button(true, true)}
              {middle_elements_?.()}
              {make_open_sorting_button(true, true)}
            </div>
          </div>
        </div>
      </Show>
    );
  };

  return (
    <SentryErrorBoundary message_={"Sorting and filters failed"} severity_={"error"}>
      <Self />
    </SentryErrorBoundary>
  );
}

function OpenFiltersButton({
  i18n_,
  search_filters_open_,
  search_sorting_open_,
  filter_button_width_,
  tabindex_,
  number_of_rendered_selected_filters_items_: [num_selected_filters],
  hide_button_,
}: {
  i18n_: solid_plp_shared_i18n;
  search_filters_open_: Signal<boolean>;
  search_sorting_open_: Signal<boolean>;
  number_of_rendered_selected_filters_items_: Signal<number>;
  filter_button_width_?: Accessor<number | undefined>;
  tabindex_: number;
  hide_button_: Accessor<boolean>;
}) {
  const filters_closed = createMemo(() => !search_filters_open_[0]());

  // We assume in embedded_num_products that this is a single HTMLElement so pls change there if you change it here
  return (
    <div class="open-filters-button-container" style={hide_button_() ? { display: "none" } : {}}>
      <Show when={num_selected_filters()}>
        <span class="num-filters" style={filters_closed() ? `` : `opacity:0`}>
          {num_selected_filters()}
        </span>
      </Show>
      <button
        tabindex={tabindex_}
        classList={{ major: !filters_closed(), minor: filters_closed() }}
        class={"filter toggle-button major-minor-transition" + (isServer ? " minor" : "")}
        type="button"
        aria-label={(filters_closed() ? i18n_.open_filters_ : i18n_.close_filters_)()}
        style={filter_button_width_?.() ? { width: filter_button_width_() + "px" } : {}}
        onClick={catchify(() =>
          batch(() => {
            if (search_filters_open_[0]()) {
              search_filters_open_[1](false);
              return;
            }
            search_filters_open_[1](true);
            search_sorting_open_[1](false);
          })
        )}
      >
        <Show when={filters_closed()} fallback={<MinusIcon />}>
          <FilterIcon />
        </Show>
        <span>{i18n_.filter_text_()}</span>
      </button>
    </div>
  );
}

function OpenSortingButton({
  i18n_,
  get_current_sorting_,
  search_filters_open_,
  available_sortings_,
  search_sorting_open_,
  sort_button_width_,
  tabindex_,
  meta_of_currently_selected_sorting_,
}: {
  search_filters_open_: Signal<boolean>;
  search_sorting_open_: Signal<boolean>;
  i18n_: solid_plp_shared_i18n;
  available_sortings_: Accessor<SortModel[] | undefined>;
  get_current_sorting_: Accessor<SortModel | undefined>;
  sort_button_width_?: Accessor<number | undefined>;
  tabindex_: number;
  meta_of_currently_selected_sorting_: Accessor<SortMeta | undefined>;
}) {
  const sorting_closed = createMemo(() => !search_sorting_open_[0]());
  // We assume in embedded_num_products that this is a single HTMLElement so pls change there if you change it here
  return (
    <button
      classList={{ major: !sorting_closed(), minor: sorting_closed() }}
      class="toggle-button for-sorting major-minor-transition"
      tabindex={tabindex_}
      aria-label={(sorting_closed() ? i18n_.open_sorting_ : i18n_.close_sorting_)()}
      style={sort_button_width_?.() ? { width: sort_button_width_() + "px" } : {}}
      onClick={catchify(() =>
        batch(() => {
          if (search_sorting_open_[0]()) {
            search_sorting_open_[1](false);
            return;
          }
          search_filters_open_[1](false);
          search_sorting_open_[1](true);
        })
      )}
    >
      <span>
        {
          // Show the title of the currently selected sorting when the sorting is closed, if there's currently a sorting selected
          // This is to balance that both it should be easy to find the sorting and to see what sorting currently is set
          // See issue description of https://gitlab.com/depict-ai/depict.ai/-/merge_requests/6537
          (sorting_closed() && meta_of_currently_selected_sorting_()?.title) || i18n_.sorting_text_()
        }
      </span>
      <Show when={sorting_closed()} fallback={<MinusIcon />}>
        {get_current_sorting_()?.order === "asc" ? <SortIconAsc /> : <SortIconDesc />}
      </Show>
    </button>
  );
}
