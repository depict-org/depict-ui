/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createResource,
  createRoot,
  createSignal,
  getOwner,
  JSX as solid_JSX,
  mergeProps,
  onCleanup,
  Resource,
  runWithOwner,
  Show,
  Signal,
  untrack,
  useContext,
} from "solid-js";
import { SortModel } from "@depict-ai/types/api/ProductListingResponseV3";
import { SearchFilter } from "@depict-ai/types/api/ProductListingRequestV2";
import { catchify, Display, Node_Array, report, use_href_accessor } from "@depict-ai/utilishared/latest";
import { media_query_to_accessor } from "../shared/helper_functions/media_query_to_accessor";
import { correct_invalid_price_range_filter } from "../shared/helper_functions/correct_invalid_price_range_filter";
import { format_number_of_results } from "../shared/helper_functions/format_number_of_results";
import { solid_category_i18n } from "../locales/i18n_types";
import { DepictAPI } from "../shared/DepictAPI";
import { ScrollStatus } from "../shared/components/ScrollStatus";
import { ModifiedLayoutOptionsAccessor, PLPResults } from "../shared/components/PLPResults";
import { SelectedFilters } from "../shared/components/SelectedFilters";
import { SortAndFilter } from "../shared/components/SortAndFilter";
import { FloatingButtons } from "../shared/components/SortAndFilter/FloatingButtons";
import { BreadCrumbs } from "./components/BreadCrumbs";
import { QuickLinks } from "./components/QuickLinks";
import { CategoryTitle } from "./components/CategoryTitle";
import { embedded_num_products } from "./helpers/embedded_num_products";
import { FilterWithData, ProductCardTemplate, ScrollRestorationData, SortObjToSendToBackend } from "../shared/types";
import {
  request_first_products_with_scroll_restoration,
  store_viewed_products_in_history_state,
} from "../shared/helper_functions/store_viewed_products_in_history_state";
import { createBatchedMemo } from "../shared/helper_functions/createBatchedMemo";
import { SentryErrorBoundary } from "../shared/components/SentryErrorBoundary";
import { DEPICT_ID } from "../shared/ids";
import { PseudoRouter } from "../shared/helper_functions/pseudo_router";
import { clear_filters_when_going_or_went_sideways } from "./helpers/clear_filters_when_going_or_went_sideways";
import { show_empty_listing_id_warning_if_needed } from "./helpers/show_empty_listing_id_warning_if_needed";
import { TextPlaceholder } from "../shared/components/Placeholders/TextPlaceholder";
import { isServer } from "solid-js/web";
import { GetListingResponseAfterDisplayTransformer, ProductListingWithPageURL } from "./types";
import { category_title_type_symbol } from "./helpers/category_title_type";
import { fix_old_filter_links } from "../shared/helper_functions/fix_old_filter_links";
import { ListingProvider } from "../shared/helper_functions/ListingContext";
import { ContentBlocksByRow } from "../shared/components/PLPResults/create_content_blocks";

import * as IdTypes from "./IdTypes";
import { ContentBlockHistoryState, useBackendContentBlocks } from "./helpers/useBackendContentBlocks";
import { useCountOfProductsForUI } from "../shared/helper_functions/useCountOfProductsForUI";
import { ProductListing } from "@depict-ai/types/api/GetListingResponse";
import { PossibleLayout } from "../sdks/types";

const PLPLayoutContext = /*@__PURE__*/ createContext<Accessor<undefined | PossibleLayout>>();

/**
 * SolidJS CategoryPage component - this is the actual CategoryPage. It's "pure" in that it doesn't care about any globals or components outside itself.
 * It just takes in a bunch of signals and accessors and renders the page.
 * Above this there's an abstraction layer in the @depict-ai/ui package in sdks/category_listing.tsx that handles all the global state, connection to the "provider" and other components and passes it down to this component.
 */
export function CategoryPage<T extends Display>({
  depict_api_,
  id_to_query_for_,
  id_type_,
  current_sorting_,
  min_products_to_fetch_,
  category_filters_open_,
  category_sorting_open_,
  expanded_filters_,
  selected_filters_,
  get_quicklinks_accessor_,
  i18n_: incoming_i18n,
  get_breadcrumb_accessor_,
  expanded_hierarchical_filters_,
  local_filter_cache_,
  merchant_,
  market_,
  router_,
  show_quicklinks_,
  category_title_,
  show_breadcrumbs_,
  layout_options_,
  scroll_restoration_data_,
  history_content_blocks_,
  product_card_template_,
  sideways_filter_clearing_flag_,
  sorting_query_param_,
  filter_query_param_prefix_,
  content_blocks_by_row_,
  filterModalParent_,
  showSliderArrow_,
  hideCount0FilterOptions_,
  switchToFiltersDrawerBreakpoint_,
}: {
  depict_api_: DepictAPI<T>;
  id_to_query_for_: Accessor<string>;
  id_type_: Accessor<IdTypes.IdType>;
  expanded_filters_: Signal<{ section_: string; expanded_: boolean }[]>;
  selected_filters_: Signal<FilterWithData[]>;
  i18n_: solid_category_i18n;
  min_products_to_fetch_: number;
  category_filters_open_: Signal<boolean>;
  get_breadcrumb_accessor_?: (breadcrumb_accessor: Accessor<ProductListingWithPageURL[] | undefined>) => void;
  get_quicklinks_accessor_?: (quicklinks_accessor: Accessor<ProductListingWithPageURL[] | undefined>) => void;
  category_sorting_open_: Signal<boolean>;
  local_filter_cache_: Signal<SearchFilter[]>;
  current_sorting_: Signal<SortModel | undefined>;
  router_: PseudoRouter;
  merchant_: Accessor<string>;
  market_: Accessor<string>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  show_breadcrumbs_: Accessor<boolean>;
  show_quicklinks_: Accessor<boolean>;
  category_title_: typeof CategoryTitle | typeof embedded_num_products;
  layout_options_: ModifiedLayoutOptionsAccessor;
  scroll_restoration_data_: Signal<ScrollRestorationData>;
  history_content_blocks_: Signal<ContentBlockHistoryState>;
  product_card_template_: ProductCardTemplate<T>;
  sideways_filter_clearing_flag_: Signal<boolean>;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  content_blocks_by_row_: Accessor<ContentBlocksByRow | undefined>;
  filterModalParent_?: HTMLElement | ShadowRoot;
  showSliderArrow_: Accessor<boolean | undefined>;
  hideCount0FilterOptions_: Accessor<boolean>;
  switchToFiltersDrawerBreakpoint_: Accessor<number | undefined>;
}) {
  let results_for: solid_JSX.Element;
  let only_show_filters_opener_: Accessor<boolean> | undefined;
  let middle_elements_: Accessor<solid_JSX.Element> | undefined;
  let on_filters_constructed_: VoidFunction | undefined;
  const i18n_ = {
    ...incoming_i18n,
    show_n_results_: incoming_i18n.show_n_products_,
    no_results_text_: incoming_i18n.no_products_text_,
  };
  const { backend_locale_ } = i18n_;
  const [get_sorting] = current_sorting_;
  const number_of_rendered_selected_filters_items_ = createSignal(0);
  const first_result_in_viewport_: Signal<number | undefined> = createSignal();
  const last_result_in_viewport_: Signal<number | undefined> = createSignal();
  const all_products_loaded_ = createSignal(false);
  const [, setAllProductsLoaded] = all_products_loaded_;
  const [currentlyLoadedDisplays, setCurrentlyLoadedDisplays_] = createSignal(0);
  const [can_write_scroll_restoration_, set_can_write_scroll_restoration] = createSignal(false);
  const owner = getOwner();
  const [metaRequestsForQuery, setMetaRequestsForQuery] = createSignal(new Map<string, ProductListing>(), {
    equals: false,
  });

  const products_query_base_ = createBatchedMemo(() => {
    const sort_obj = get_sorting() && { ...get_sorting() };
    delete sort_obj?.meta;
    const f = selected_filters_[0]();

    return {
      merchant: merchant_(),
      market: market_(),
      locale: backend_locale_(),
      id_to_query_for_: id_to_query_for_(),
      id_type_: id_type_(),
      ...(f.length ? { filters: f } : {}),
      ...(sort_obj ? { sort: sort_obj as SortObjToSendToBackend } : {}),
    };
  });
  // Make "Get products in listing" request to get products in listing
  const [plp_products_] = createResource(
    products_query_base_,
    // only first page of results, unless the history state says we should load more (can't do that in load more thing, I tested, they need to be added at once for the browser to not give up scroll restoration)
    catchify((base_query: ReturnType<typeof products_query_base_>) => {
      setAllProductsLoaded(false);
      return request_first_products_with_scroll_restoration({
        id_: untrack(id_to_query_for_),
        scroll_restoration_data_,
        min_products_to_fetch_,
        make_request_: (limit, cursor) =>
          depict_api_.get_listing_products({
            ...base_query,
            limit,
            ...(cursor ? { cursor } : {}),
            // This gets exposed to the products display transformer and gives it information about the listing the products are in
            // It's very hard to implement tracking that uses the collection title without this information
            currentListingForTransformer_: new Promise(resolve =>
              createRoot(dispose => {
                createEffect(
                  catchify(() => {
                    const key = base_query.id_type_ + base_query.id_to_query_for_;
                    const metaResponsePromise = metaRequestsForQuery().get(key);
                    if (!metaResponsePromise) return;
                    resolve(metaResponsePromise);
                    dispose();
                    setMetaRequestsForQuery(prev => (prev.delete(key), prev));
                  })
                );
                runWithOwner(owner, () => onCleanup(dispose));
              })
            ),
          }),
      });
    })
  );
  const meta_query_base = createBatchedMemo(() => ({
    merchant: merchant_(),
    market: market_(),
    locale: backend_locale_(),
    id_to_query_for_: id_to_query_for_(),
    id_type_: id_type_(),
  }));
  // Make "Get Listing" request to get quicklinks, breadcrumbs, title, etc
  const [plp_meta] = createResource(
    meta_query_base,
    catchify(async (query: ReturnType<typeof meta_query_base>) => {
      const result = await depict_api_.get_listing(query);
      // In the following two lines, do not expose the finished breadcrumbs and quicklinks in the products display transformer since it's already exposed in the categories display transformer
      const { breadcrumbs, quick_links, ...listing } = result;
      setMetaRequestsForQuery(prev => prev.set(query.id_type_ + query.id_to_query_for_, listing));
      return result;
    })
  );

  const contentBlocksByRow = useBackendContentBlocks(
    history_content_blocks_,
    plp_meta,
    content_blocks_by_row_,
    router_,
    () => plp_products_.loading
  );

  const countOfProductsForUI = useCountOfProductsForUI(plp_products_, all_products_loaded_, currentlyLoadedDisplays);
  const available_sortings_ = createMemo(
    () => plp_products_()?.sorts?.map(sort => ({ ...sort, order: sort.order ?? "desc" }))
  );
  const available_filters_ = createMemo(() => plp_products_()?.filters);
  const title = createMemo(() => plp_meta()?.title);
  const crumb_data_ = add_us_to_crumbs(plp_meta);
  const quicklinks_data_ = createMemo(() => plp_meta()?.quick_links);

  const [sort_or_filter_open_, set_sort_or_filter_open_] = createSignal(false);
  const [desktop_filter_elements_, set_desktop_filter_elements] = createSignal<solid_JSX.Element>();
  const formatted_number_of_results_ = format_number_of_results({
    number_: countOfProductsForUI,
    i18n_,
  });
  const [sort_and_filter_element_, set_sort_and_filter_element_]: Signal<HTMLDivElement | undefined> = createSignal();
  // Sort and filter button
  const [results_filters, set_results_filters] = createSignal<solid_JSX.Element>();
  // Cloned, invisible sort and filter button used for measuring the minimum size of the buttons if using embedded_num_products
  const [observed_results_filters_elements, set_observed_results_filters_elements_] = createSignal<solid_JSX.Element>();
  const is_slim_ = media_query_to_accessor("(max-width:600px)");
  // @ts-ignore - there's no type error here when writing the code, but parcel can't generate types that include the symbol, so we need to suppress the error that creates in our pipelines
  const category_title_type = category_title_[category_title_type_symbol] as "interactive" | "simple";
  const extra_sort_and_filter_args_ = {} as {
    get_extra_sorting_button_?: (extra_button: solid_JSX.Element) => unknown;
    get_extra_filters_button_?: (extra_button: solid_JSX.Element) => unknown;
    sort_button_width_?: Accessor<number | undefined>;
    filter_button_width_?: Accessor<number | undefined>;
  };
  const ConfiguredScrollStatus_ = (
    extraProps: {
      get_scroll_position_?: () => number;
      listen_to_scroll_on_?: Element;
      velocity_too_fast_?: number;
    } = {}
  ) => (
    <SentryErrorBoundary severity_="error" message_="Scroll status failed">
      {ScrollStatus({
        first_result_in_viewport_,
        last_result_in_viewport_,
        formatted_number_of_results_,
        i18n_,
        number_of_results_: countOfProductsForUI,
        ...extraProps,
      })}
    </SentryErrorBoundary>
  );
  const make_product_count_ = () => (
    // we assume in embedded_num_products that this is a div
    <div class="product-count">
      <Show when={plp_products_.loading} fallback={formatted_number_of_results_ as unknown as solid_JSX.Element}>
        {" "}
        <TextPlaceholder height="1em" width="3ch" />
      </Show>{" "}
      <Show when={countOfProductsForUI() === 1} fallback={i18n_.products_()}>
        {i18n_.product_()}
      </Show>
    </div>
  );

  fix_old_filter_links(plp_products_, selected_filters_);

  // aiming to have as little unneeded functionality in the bundle as possible, therefore we have two kinds of components that can "plug in" here depending on if there should be a title in the category page along with the count in a row above the buttons on mobile or if it should merge between the buttons when possible
  if (category_title_type === "simple") {
    const CategoryTitleComponent = category_title_ as typeof CategoryTitle;
    results_for = <CategoryTitleComponent category_title_={title} product_count_={make_product_count_()} />;
  } else if (category_title_type == "interactive") {
    ({ middle_elements_, only_show_filters_opener_, on_filters_constructed_ } = (
      category_title_ as typeof embedded_num_products
    )({
      make_product_count_,
      is_slim_,
      set_observed_results_filters_elements_,
      extra_sort_and_filter_args_,
      sort_and_filter_element_,
    }));
    results_for = make_product_count_();
  } else {
    report(new Error("Unrecognised category_title_type, UI will look messed up"), "error");
    results_for = <div />;
  }

  const sort_and_filter_disabled_ = createMemo(() => layout_options_().layout === "slider-without-filters");

  const filters_opener = SortAndFilter({
    set_sort_or_filter_open_,
    set_extra_els_in_results_container_: set_desktop_filter_elements,
    i18n_,
    search_sorting_open_: category_sorting_open_,
    available_filters_,
    available_sortings_,
    middle_elements_,
    search_filters_open_: category_filters_open_,
    set_sort_and_filter_element_,
    current_sorting_,
    expanded_filters_,
    selected_filters_,
    formatted_number_of_results_,
    local_filter_cache_,
    expanded_hierarchical_filters_,
    number_of_rendered_selected_filters_items_,
    sort_and_filter_disabled_,
    filterModalParent_,
    hideCount0FilterOptions_,
    switchToFiltersDrawerBreakpoint_,
    ...extra_sort_and_filter_args_,
  });

  catchify(store_viewed_products_in_history_state)({
    scroll_restoration_data_,
    last_result_in_viewport_,
    id_: id_to_query_for_,
    can_write_scroll_restoration_,
  });

  createEffect(() => {
    if (sort_and_filter_disabled_()) return;
    on_filters_constructed_?.();
  });

  createComputed(() => {
    if (plp_products_.loading) {
      set_can_write_scroll_restoration(false);
    } else if (plp_products_()) {
      set_can_write_scroll_restoration(true);
    }
  });

  createRenderEffect(
    catchify(async () => {
      const slim = is_slim_();
      const only_show_filters_opener = only_show_filters_opener_?.();
      const owner = getOwner()!;
      await set_results_filters(); // remove elements, wait one microtask for updates to have been committed to the DOM, otherwise we'd try to do illegal DOM operations
      // signals can't be read reactively anymore after the await FYI

      runWithOwner(owner, () =>
        set_results_filters(
          slim ? (
            only_show_filters_opener ? (
              filters_opener
            ) : (
              [results_for, filters_opener]
            )
          ) : (
            <div class="filter-results-for-one-row">
              {results_for}
              {filters_opener}
            </div>
          )
        )
      );
    })
  );

  correct_invalid_price_range_filter({ selected_filters_, available_filters_ });

  clear_filters_when_going_or_went_sideways({
    id_to_query_for_: id_to_query_for_,
    crumb_data_,
    i18n_,
    selected_filters_,
    local_filter_cache_,
    expanded_hierarchical_filters_,
    plp_results_: plp_products_,
    sideways_filter_clearing_flag_,
    id_type_,
    expanded_filters_,
    filters_open_: category_filters_open_,
  });

  get_breadcrumb_accessor_?.(crumb_data_);
  get_quicklinks_accessor_?.(quicklinks_data_);

  return [
    isServer
      ? "<!-- Category page based on Depict SDK -->"
      : document.createComment("Category page based on Depict SDK"),
    <div
      id={DEPICT_ID.PLP_CATEGORY}
      class="depict plp category"
      ref={el =>
        process.env.NODE_ENV === "development" && show_empty_listing_id_warning_if_needed(el, id_to_query_for_, i18n_)
      }
    >
      <div class="listing-page">
        <Show when={show_breadcrumbs_()}>
          <BreadCrumbs
            crumb_data_={crumb_data_}
            router_={router_}
            i18n_={i18n_}
            sorting_query_param_={sorting_query_param_}
            filter_query_param_prefix_={filter_query_param_prefix_}
          />
        </Show>
        <Show when={show_quicklinks_()}>
          <QuickLinks
            quicklinks_data_={quicklinks_data_}
            id_to_query_for_={id_to_query_for_}
            id_type_={id_type_}
            router_={router_}
            breadcrumb_data_={crumb_data_}
            i18n_={i18n_}
            sorting_query_param_={sorting_query_param_}
            filter_query_param_prefix_={filter_query_param_prefix_}
          />
        </Show>
        {observed_results_filters_elements()}
        {results_filters()}
        <Show when={selected_filters_[0]()?.length}>
          <SentryErrorBoundary severity_="error" message_="Selected filters failed">
            {SelectedFilters({
              i18n_,
              selected_filters_,
              local_filter_cache_,
              get_search_filters_open_: category_filters_open_[0],
              get_search_sorting_open_: category_sorting_open_[0],
              number_of_rendered_selected_filters_items_,
              expanded_hierarchical_filters_,
            })}
          </SentryErrorBoundary>
        </Show>
        <SentryErrorBoundary severity_="error" message_="Showing results failed">
          <PLPLayoutContext.Provider value={() => layout_options_().layout}>
            <ListingProvider>
              {PLPResults({
                // if you want to get if all products have been loaded you can add an optional signal here, see SearchPage
                min_products_to_fetch_,
                query_base_: products_query_base_,
                plp_results_: plp_products_,
                depict_api_,
                first_result_in_viewport_,
                last_result_in_viewport_,
                scroll_restoration_data_,
                layout_options_,
                product_card_template_,
                sort_or_filter_open_,
                desktop_filter_elements_,
                content_blocks_by_row_: contentBlocksByRow,
                ConfiguredScrollStatus_,
                id_currently_querying_for_: id_to_query_for_,
                setCurrentlyLoadedDisplays_,
                showSliderArrow_,
                all_products_loaded_,
                no_results_options_: {
                  selected_filters_,
                  expanded_hierarchical_filters_,
                  i18n_,
                  local_filter_cache_,
                },
              })}
            </ListingProvider>
          </PLPLayoutContext.Provider>
        </SentryErrorBoundary>
      </div>
      <Show when={!layout_options_().layout?.startsWith("slider")}>
        <ConfiguredScrollStatus_ />
        {/* When in slider layout FloatingButtuons is useless, therefore hiding them */}
        <SentryErrorBoundary severity_="error" message_="Floating buttons failed">
          {FloatingButtons({
            search_filters_open_: category_filters_open_,
            search_sorting_open_: category_sorting_open_,
            current_sorting_,
            sort_and_filter_element_,
            i18n_,
          })}
        </SentryErrorBoundary>
      </Show>
    </div>,
  ] as Node_Array;
}

/**
 * Adds the current page as last breadcrumb to the breadcrumb trail
 */
function add_us_to_crumbs(
  plp_meta: Resource<(GetListingResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
) {
  const href_accessor = use_href_accessor();

  return createMemo(() => {
    const api_value = plp_meta()?.breadcrumbs;
    if (!api_value || plp_meta()?.show_in_breadcrumbs === false) return api_value;
    return [
      ...api_value,
      mergeProps(plp_meta(), {
        get page_url() {
          return href_accessor();
        },
      }),
    ];
  });
}

/**
 * When called in something rendered as child of <CategoryPage>, this will return the current layout of the page (grid or slider).
 */
export function usePLPLayout() {
  return useContext(PLPLayoutContext);
}
