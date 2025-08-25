/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  getOwner,
  JSX,
  JSX as solid_JSX,
  onCleanup,
  runWithOwner,
  Setter,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { SortModel } from "@depict-ai/types/api/SearchResponse";
import { SearchFilter } from "@depict-ai/types/api/SearchRequestV3";
import { catchify, Display, javascript_media_query, Node_Array } from "@depict-ai/utilishared";
import {
  align_field,
  ALIGN_LEFT,
  ALIGN_TOP,
  ALIGN_WIDTH_ON_FIELD_IN_MODAL,
  ALIGN_WIDTH_ON_MODAL,
  ModalAlignmentSignals,
  SET_CENTERED_LEFT,
} from "./helper_functions/align_field";
import { correct_invalid_price_range_filter } from "../shared/helper_functions/correct_invalid_price_range_filter";
import { format_number_of_results } from "../shared/helper_functions/format_number_of_results";
import { solid_search_i18n } from "../locales/i18n_types";
import { DepictAPI } from "../shared/DepictAPI";
import { CategorySuggestions, RenderCategorySuggestion } from "./components/CategorySuggestions";
import { SearchField } from "./components/SearchField";
import { ScrollStatus } from "../shared/components/ScrollStatus";
import { SearchRecommendations } from "./components/SearchRecommendations";
import { ModifiedLayoutOptionsAccessor, PLPResults } from "../shared/components/PLPResults";
import { SelectedFilters } from "../shared/components/SelectedFilters";
import { SentryErrorBoundary } from "../shared/components/SentryErrorBoundary";
import { ShowingResultsFor, ShowingResultsForType } from "../shared/components/ShowingResultsFor";
import { SortAndFilter } from "../shared/components/SortAndFilter";
import { FloatingButtons } from "../shared/components/SortAndFilter/FloatingButtons";
import { send_search_query_to_ga } from "./helper_functions/send_search_query_to_ga";
import { FilterWithData, ProductCardTemplate, ScrollRestorationData, SortObjToSendToBackend } from "../shared/types";
import { createBatchedMemo } from "../shared/helper_functions/createBatchedMemo";
import {
  request_first_products_with_scroll_restoration,
  store_viewed_products_in_history_state,
} from "../shared/helper_functions/store_viewed_products_in_history_state";
import { DEPICT_ID } from "../shared/ids";
import { center_modal_style_props } from "./helper_functions/center_modal_style_props";
import { isServer } from "solid-js/web";
import { fix_old_filter_links } from "../shared/helper_functions/fix_old_filter_links";
import { ContentResults } from "./components/ContentResults";
import { PseudoRouter } from "../shared/helper_functions/pseudo_router";
import { ListingProvider } from "../shared/helper_functions/ListingContext";
import { ContentBlocksByRow } from "../shared/components/PLPResults/create_content_blocks";
import { replaceWithFakeFieldAndAnimate } from "./helper_functions/replaceWithFakeFieldAndAnimate";
import { useCountOfProductsForUI } from "../shared/helper_functions/useCountOfProductsForUI";

type SearchPageOptions<T extends Display> = {
  depict_api_: DepictAPI<T>;
  search_field_value_: Signal<string>;
  get_search_query_: Accessor<string>;
  clear_filters_on_next_submit_: (user_triggered: boolean) => void;
  expanded_filters_: Signal<{ section_: string; expanded_: boolean }[]>;
  input_modal_open_: Accessor<boolean>;
  open_modal_: (
    options_for_modal: {
      setSearchFieldOuterWidth_?: Setter<number>;
      closing_animation_?: () => Promise<any>;
      alignmentSignals_: ModalAlignmentSignals;
      selected_text_range_?: readonly [number | null, number | null] | [number | null, number | null];
    },
    on_dispose?: VoidFunction | undefined
  ) => void;
  submit_query_: VoidFunction;
  selected_filters_: Signal<FilterWithData[]>;
  i18n_: solid_search_i18n;
  min_products_to_fetch_: number;
  search_filters_open_: Signal<boolean>;
  modalVersionUsed_: 1 | 2;
  search_sorting_open_: Signal<boolean>;
  local_filter_cache_: Signal<SearchFilter[]>;
  current_sorting_: Signal<SortModel | undefined>;
  tenant_: Accessor<string>;
  market_: Accessor<string>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  product_card_template_: ProductCardTemplate<T>;
  layout_options_: ModifiedLayoutOptionsAccessor;
  content_layout_options_: Accessor<ReturnType<SearchPageOptions<T>["layout_options_"]>>; // should not be allowed to have more than 1 column on mobile sizes
  showing_recommendation_rows_: Signal<number>;
  content_results_rows_: Signal<number>;
  router_: PseudoRouter;
  content_search_enabled_: Accessor<boolean>;
  BackIcon_: () => JSX.Element;
  showSliderArrow_: Accessor<boolean | undefined>;
  switchToFiltersDrawerBreakpoint_: Accessor<number | undefined>;
  /** Set to false to disable category suggestions */
  make_category_suggestion_card_: RenderCategorySuggestion | false;
  scroll_restoration_data_: Signal<ScrollRestorationData>;
  include_input_field_?: Accessor<boolean | undefined | { on_open_?: VoidFunction; on_close_?: VoidFunction }>;
  /** Only applicable if include_input_field is not false or undefined */
  modalAlignmentSignalsRef_?: (modal_body_style: ModalAlignmentSignals) => void;
  content_blocks_by_row_: Accessor<ContentBlocksByRow | undefined>;
  filterModalParent_?: HTMLElement | ShadowRoot; // Needed by style editor in shopify plugin
  class_?: Accessor<string | undefined>;
  hideCount0FilterOptions_: Accessor<boolean>;
};

/**
 * SolidJS SearchPage component - this is the actual SearchPage. It's "pure" in that it doesn't care about any globals or components outside itself.
 * It just takes in a bunch of signals and accessors and renders the page.
 * Above this there's an abstraction layer in the @depict-ai/ui package in sdks/search.tsx that handles all the global state, connection to the "provider" and other components and passes it down to this component.
 */
export function SearchPage<T extends Display>({
  depict_api_,
  search_field_value_,
  get_search_query_,
  open_modal_,
  submit_query_,
  current_sorting_,
  min_products_to_fetch_,
  search_filters_open_,
  search_sorting_open_,
  expanded_filters_,
  input_modal_open_,
  selected_filters_,
  i18n_,
  make_category_suggestion_card_,
  expanded_hierarchical_filters_,
  clear_filters_on_next_submit_,
  local_filter_cache_,
  include_input_field_,
  tenant_,
  market_,
  showing_recommendation_rows_,
  layout_options_,
  scroll_restoration_data_,
  product_card_template_,
  modalAlignmentSignalsRef_,
  router_,
  content_results_rows_,
  content_layout_options_,
  content_search_enabled_,
  content_blocks_by_row_,
  modalVersionUsed_,
  BackIcon_,
  filterModalParent_,
  class_,
  showSliderArrow_,
  hideCount0FilterOptions_,
  switchToFiltersDrawerBreakpoint_,
}: SearchPageOptions<T>) {
  const [get_sorting] = current_sorting_;
  const all_products_loaded_ = createSignal(false);
  const [currentlyLoadedDisplays, setCurrentlyLoadedDisplays_] = createSignal(0);
  const [get_all_products_loaded, set_all_products_loaded] = all_products_loaded_;
  const number_of_rendered_selected_filters_items_ = createSignal(0);
  const first_result_in_viewport_: Signal<number | undefined> = createSignal();
  const last_result_in_viewport_: Signal<number | undefined> = createSignal();
  const [can_write_scroll_restoration_, set_can_write_scroll_restoration] = createSignal(false);
  const { backend_locale_ } = i18n_;

  const search_query_base_ = createBatchedMemo(() => {
    const sort_obj = get_sorting() && { ...get_sorting() };
    delete sort_obj?.meta;
    const f = selected_filters_[0]();

    return {
      merchant: tenant_(),
      market: market_(),
      locale: backend_locale_(),
      query: get_search_query_(),
      ...(f.length ? { filters: f } : {}),
      ...(sort_obj ? { sort: sort_obj as SortObjToSendToBackend } : {}),
    };
  });
  const [search_results_] = createResource(
    search_query_base_,
    catchify(async (base_query: ReturnType<typeof search_query_base_>) => {
      set_all_products_loaded(false);
      // only first page of results
      return await request_first_products_with_scroll_restoration({
        id_: untrack(get_search_query_),
        min_products_to_fetch_,
        scroll_restoration_data_,
        make_request_: (limit, cursor) =>
          depict_api_.query({
            ...base_query,
            limit,
            ...(cursor ? { cursor } : {}),
          }),
      });
    })
  );

  const [suggestions] = createResource(
    () => ({ query: get_search_query_(), merchant: tenant_(), market: market_(), locale: backend_locale_() }),
    opts => depict_api_.suggest(opts)
  );

  const available_sortings_ = createMemo(
    () => search_results_()?.sorts?.map(sort => ({ ...sort, order: sort.order ?? "desc" }))
  );
  const available_filters_ = createMemo(() => search_results_()?.filters);

  const modal_body_style = createSignal<solid_JSX.CSSProperties>({});
  const modal_backdrop_style = createSignal<solid_JSX.CSSProperties>({});
  const modal_field_style = createSignal<solid_JSX.CSSProperties>({});
  const alignmentSignals_: ModalAlignmentSignals = {
    body_: modal_body_style,
    field_: modal_field_style,
    backdrop_: modal_backdrop_style,
  };
  const [, setModalBodyStyle] = modal_body_style;
  const [, setModalFieldStyle] = modal_field_style;
  const [, setModalBackdropStyle] = modal_backdrop_style;
  const [get_search_field_elements, set_search_field_elements] = createSignal<solid_JSX.Element>();
  const SafeSearchField = catchify(SearchField);

  const [sort_or_filter_open_, set_sort_or_filter_open_] = createSignal(false);
  const [desktop_filter_elements_, set_desktop_filter_elements] = createSignal<solid_JSX.Element>();
  const countOfProductsForUI = useCountOfProductsForUI(search_results_, all_products_loaded_, currentlyLoadedDisplays);
  const formatted_number_of_results_ = format_number_of_results({ number_: countOfProductsForUI, i18n_ });
  const [sort_and_filter_element_, set_sort_and_filter_element_]: Signal<HTMLDivElement | undefined> = createSignal();
  const no_results_text_ = createMemo(() =>
    (search_results_()?.content_search_links?.length ? i18n_.no_products_ : i18n_.no_results_text_)()
  );

  const results_for = (
    <ShowingResultsFor
      type={ShowingResultsForType.products}
      number_of_results_={countOfProductsForUI}
      {...{ get_search_query_, i18n_, formatted_number_of_results_ }}
    />
  );

  const filters_opener = SortAndFilter({
    set_sort_or_filter_open_,
    set_extra_els_in_results_container_: set_desktop_filter_elements,
    i18n_,
    search_sorting_open_,
    available_filters_,
    available_sortings_,
    search_filters_open_,
    set_sort_and_filter_element_,
    current_sorting_,
    input_modal_open_,
    expanded_filters_,
    selected_filters_,
    formatted_number_of_results_,
    local_filter_cache_,
    expanded_hierarchical_filters_,
    number_of_rendered_selected_filters_items_,
    filterModalParent_,
    hideCount0FilterOptions_,
    switchToFiltersDrawerBreakpoint_,
  });

  const results_filters = createSignal<solid_JSX.Element>();
  const shouldActuallyShowInputField = createMemo(() => include_input_field_?.() ?? true); // default to showing input field
  const owner = getOwner()!;
  onCleanup(
    javascript_media_query("(max-width:600px)", async ({ matches }) => {
      results_filters[1]();
      await new Promise<void>(r => queueMicrotask(r));
      runWithOwner(owner, () =>
        results_filters[1](
          matches ? (
            [results_for, filters_opener]
          ) : (
            <div class="filter-results-for-one-row">
              {results_for}
              {filters_opener}
            </div>
          )
        )
      );
    }).remove
  );

  fix_old_filter_links(search_results_, selected_filters_);

  catchify(store_viewed_products_in_history_state)({
    scroll_restoration_data_,
    last_result_in_viewport_,
    id_: get_search_query_,
    can_write_scroll_restoration_,
  });

  createComputed(() => {
    if (search_results_.loading) {
      set_can_write_scroll_restoration(false);
    } else if (search_results_()) {
      set_can_write_scroll_restoration(true);
    }
  });

  correct_invalid_price_range_filter({ selected_filters_, available_filters_ });

  // @ts-ignore
  if (process.env.GA !== "false") {
    createEffect(() => {
      get_search_query_();
      send_search_query_to_ga(location);
    });
  }

  createEffect(() => {
    // reactive include_input_field
    // this uses ~7 variables from outer scope which is why I didn't refactor it into a function
    // After above time has been wasted:
    // DO NOT ATTEMPT to consolidate this code and the code in sdks/search.ts (SDKSearchField) that both open modals aligned to a search field
    // Hours were wasted in https://github.com/depict-org/depict/pull/137/commits/ff6563a8deb7ba09e181a7a34831fb66997fa8aa and following commits
    // Reason it doesn't work is due to the complex alignment switching when the search field gets removed, and even after solving that: that opening a modal with unspecified alignment aligns it to the search field on the search page
    add_input_field: {
      const input_field_accessor_value = shouldActuallyShowInputField();
      if (!input_field_accessor_value) break add_input_field;

      let input_element: HTMLInputElement;
      let div_with_field_class: HTMLDivElement | undefined;
      let buttonInField: HTMLButtonElement;

      const search_field = SafeSearchField({
        i18n_,
        search_field_value_,
        submit_query_,
        clear_filters_: clear_filters_on_next_submit_,
        input_field_ref_: el => (input_element = el),
        field_element_ref_: el => (div_with_field_class = el),
        disabled_: true,
        BackIcon_,
        buttonInFieldRef_: el => (buttonInField = el),
      });

      if (!search_field) break add_input_field;
      setModalBodyStyle({});
      modalAlignmentSignalsRef_?.(alignmentSignals_);

      const [pollAlignment, setPollAlignment_] = createSignal(false);
      const align_position = catchify(align_field)(
        alignmentSignals_,
        search_field,
        ALIGN_TOP |
          ALIGN_LEFT |
          (modalVersionUsed_ === 1 ? ALIGN_WIDTH_ON_MODAL : SET_CENTERED_LEFT | ALIGN_WIDTH_ON_FIELD_IN_MODAL),
        true,
        pollAlignment
      );
      div_with_field_class!.addEventListener(
        "click",
        catchify(e => {
          const target = e.target as HTMLElement;
          const sel = ".submit";
          if (target?.matches?.(sel) || target?.closest?.(sel)) {
            // the search button is just decor, don't do anything when clicked
            return;
          }
          // When selecting text in the SearchField that's in the page we want the same selection to persist. It doesn't by itself, since the SearchModal has an entirely different SearchField. Therefore, we manually copy the selection over.
          const selected_text_range_ = [input_element.selectionStart, input_element.selectionEnd] as const;

          let setModalSearchFieldOuterWidth_: Setter<number> | undefined;
          let revert: (() => Promise<void>) | undefined;
          if (modalVersionUsed_ === 2) {
            let modalSearchFieldOuterWidth_: Accessor<number>;
            [modalSearchFieldOuterWidth_, setModalSearchFieldOuterWidth_] = createSignal(0);
            revert = replaceWithFakeFieldAndAnimate({
              actualField_: search_field as HTMLDivElement,
              makeFakeField_: () =>
                (
                  <SearchField
                    BackIcon_={BackIcon_}
                    search_field_value_={search_field_value_}
                    submit_query_={submit_query_}
                    clear_filters_={clear_filters_on_next_submit_}
                    i18n_={i18n_}
                    disabled_={true}
                  />
                ) as HTMLDivElement,
              wrap_: true,
              bodyAlignmentSignal_: modal_body_style,
              backdropStyleSignal_: modal_backdrop_style,
              setPollAlignment_,
              buttonInField_: buttonInField,
              modalSearchFieldOuterWidth_,
            });
          }

          align_position?.();
          open_modal_(
            {
              alignmentSignals_,
              selected_text_range_,
              closing_animation_: revert,
              setSearchFieldOuterWidth_: setModalSearchFieldOuterWidth_,
            },
            () => {
              // When modal is closed, reset style signals for next opening so all animation related stuff gets reset
              setModalBodyStyle({});
              setModalFieldStyle({});
              setModalBackdropStyle({});
              // And run the alignment code again so the modal is readily aligned when opened via a search button
              align_position?.();
              (input_field_accessor_value as { on_close_?: VoidFunction | undefined })?.on_close_?.();
            }
          );
          (input_field_accessor_value as { on_open_?: VoidFunction | undefined })?.on_open_?.();
        })
      );

      set_search_field_elements(search_field);
      return;
    }
    // We bailed out of adding the input field
    set_search_field_elements();
    // There *might* still be a modal open, either from depict_search.modal_open = true or clicking the SearchField which existed here. Said modal now doesn't have anything to align to anymore - it will still try to align to the style_props_ which it got through the modal_body_style_ref_ which are now no longer updated.
    // In that case, we write what's needed to center the modal to the modal_body_style for the lifetime of this effect function call to make sure the modal is centered and the UI doesn't look "botched".
    center_modal_style_props({ alignmentSignals_ });
  });

  return [
    isServer ? "<!-- Search page based on Depict SDK -->" : document.createComment("Search page based on Depict SDK"),
    <div id={DEPICT_ID.SEARCH_PAGE} class={`depict plp search${class_?.() ? ` ${class_()}` : ""}`}>
      <div class="listing-page">
        {get_search_field_elements()}
        {make_category_suggestion_card_ ? (
          <SentryErrorBoundary severity_="error" message_="Category suggestions failed">
            <CategorySuggestions suggestions_={suggestions}>{make_category_suggestion_card_}</CategorySuggestions>
          </SentryErrorBoundary>
        ) : null}
        <SentryErrorBoundary severity_="error" message_="ContentResults failed">
          <Show when={content_search_enabled_()}>
            <ListingProvider>
              <ContentResults
                content_results_rows_={content_results_rows_}
                search_results_={search_results_}
                i18n_={i18n_}
                get_search_query_={get_search_query_}
                layout_options_={content_layout_options_}
                router_={router_}
                query_base_={search_query_base_}
              />
            </ListingProvider>
          </Show>
        </SentryErrorBoundary>
        {results_filters[0]()}
        <Show when={selected_filters_[0]()?.length} keyed={false}>
          <SentryErrorBoundary message_="Selected filters failed" severity_="error">
            {SelectedFilters({
              i18n_,
              selected_filters_,
              local_filter_cache_,
              get_search_filters_open_: search_filters_open_[0],
              get_search_sorting_open_: search_sorting_open_[0],
              number_of_rendered_selected_filters_items_,
              expanded_hierarchical_filters_,
            })}
          </SentryErrorBoundary>
        </Show>
        <SentryErrorBoundary severity_="error" message_="Search results failed">
          <ListingProvider>
            {PLPResults({
              all_products_loaded_,
              min_products_to_fetch_,
              query_base_: search_query_base_,
              plp_results_: search_results_,
              depict_api_,
              first_result_in_viewport_,
              last_result_in_viewport_,
              scroll_restoration_data_,
              desktop_filter_elements_,
              product_card_template_,
              layout_options_,
              sort_or_filter_open_,
              id_currently_querying_for_: get_search_query_,
              content_blocks_by_row_,
              setCurrentlyLoadedDisplays_,
              showSliderArrow_,
              no_results_options_: {
                selected_filters_,
                expanded_hierarchical_filters_,
                local_filter_cache_,
                i18n_: { ...i18n_, no_results_text_ },
              },
            })}
          </ListingProvider>
        </SentryErrorBoundary>
        <SentryErrorBoundary severity_="error" message_="Search recommendations failed">
          <ListingProvider>
            <SearchRecommendations
              depict_api_={depict_api_}
              i18n_={i18n_}
              search_query_base_={search_query_base_}
              layout_options_={layout_options_}
              showing_recommendation_rows_={showing_recommendation_rows_}
              product_card_template_={product_card_template_}
              all_products_loaded_={get_all_products_loaded}
            />
          </ListingProvider>
        </SentryErrorBoundary>
      </div>
      <SentryErrorBoundary message_="Scroll status failed" severity_="error">
        {ScrollStatus({
          first_result_in_viewport_,
          last_result_in_viewport_,
          formatted_number_of_results_,
          i18n_,
          number_of_results_: countOfProductsForUI,
        })}
      </SentryErrorBoundary>
      <SentryErrorBoundary message_="Floating buttons failed" severity_="error">
        {FloatingButtons({
          search_filters_open_,
          search_sorting_open_,
          current_sorting_,
          sort_and_filter_element_,
          i18n_,
        })}
      </SentryErrorBoundary>
    </div>,
  ] as Node_Array;
}
