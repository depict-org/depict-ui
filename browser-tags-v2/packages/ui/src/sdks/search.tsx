/* @refresh reload */
/** @jsxImportSource solid-js */
import { SearchFilter, SortModel } from "@depict-ai/types/api/SearchRequestV2";
import { catchify, Display, ModernDisplay } from "@depict-ai/utilishared";
import {
  Accessor,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  getOwner,
  JSX,
  onCleanup,
  runWithOwner,
  Setter,
  Signal,
  untrack,
} from "solid-js";
import { GenericCategorySuggestionCard } from "../search/components/GenericCategorySuggestionCard";
import { search_recommendation_start_rows } from "../search/components/SearchRecommendations";
import { ModalAlignmentSignals } from "../search/helper_functions/align_field";
import { filter_clearing_helper_factory } from "../search/helper_functions/filter_clearing_helper";
import { modal_opener } from "../search/helper_functions/modal_opener";
import { make_previous_searches_signal } from "../search/helper_functions/previous_searches_signal";
import { submit_query_handler } from "../search/helper_functions/submit_query";
import { search_i18n, solid_search_i18n } from "../locales/i18n_types";
import { SearchModalV2 } from "../search/components/modal/v2/SearchModalV2";
import { SearchPage } from "../search/SearchPage";
import { DepictAPI } from "../shared/DepictAPI";
import {
  convert_sdk_cols_at_size_to_layout,
  SDKColsAtSize,
} from "../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { make_resettable_history_state } from "../shared/helper_functions/make_resettable_history_state";
import { preserve_items_in_history_dot_state } from "../shared/helper_functions/preserve_items_in_history_dot_state";
import { FilterWithData, ProductCardTemplate, ScrollRestorationData, SDKGridSpacing } from "../shared/types";
import { accessor_of_object_to_object_with_accessor_values } from "../shared/helper_functions/accessor_of_object_to_object_with_accessor_values";
import { run_in_root_or_auto_cleanup } from "../shared/helper_functions/run_in_root_or_auto_cleanup";
import { url_state } from "../shared/url_state/url_state";
import { OnNavigation, PseudoRouter } from "../shared/helper_functions/pseudo_router";
import { center_modal_style_props } from "../search/helper_functions/center_modal_style_props";
import { isServer } from "solid-js/web";
import { content_results_start_rows } from "../search/components/ContentResults";
import { limit_cols_at_size_for_content_results } from "../search/helper_functions/limit_cols_at_size_for_content_results";
import { ModernDisplayWithPageUrl, SomethingTakingADisplayTransformers } from "../shared/display_transformer_types";
import { throw_globally } from "../shared/helper_functions/throw_globally";

import { ContentBlocksByRow } from "../shared/components/PLPResults/create_content_blocks";
import { ClassicSearchModal } from "../search/components/modal/classic/ClassicSearchModal";
import { backIconSymbol, modalVersionSymbol } from "../search/helper_functions/modalVersionSymbol";
import { setupDefaultAnimations } from "../search/helper_functions/modalV2Animations";

type GeneralConstructorOptions<InputDisplay extends Display, OutputDisplay extends ModernDisplay | never> = {
  search_query_url_param_name?: string;
  market: string;
  merchant: string;
  localization: search_i18n;
  on_navigation?: OnNavigation;
  url_transformer?: (url_object: URL) => unknown;
  enable_category_suggestions?: boolean;
  enable_content_search?: boolean;
  unique_instance_key_for_state?: string;
  searchModalComponent: typeof SearchModalV2<InputDisplay, OutputDisplay> | typeof ClassicSearchModal;
  // Stuff needed for non-standard customer deployments that we shouldn't actually expose
  disable_scrolling_during_modal?: boolean;
  bottom_distance_under_modal?: Accessor<number | undefined>;
  override_modal_element?: HTMLElement | ShadowRoot; // needed by shopify plugin
};

type ConstructorOptionsWithApi<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = GeneralConstructorOptions<InputDisplay, OutputDisplay> & {
  api: DepictAPI<InputDisplay, OutputDisplay>;
} & { page_url_creator?: never; display_transformers?: never };

// We just pass page_url_creator to DepictAPI when we instantiate it, so don't allow it to be specified if api is already specified
type ConstructorOptionsWithoutAPI<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = GeneralConstructorOptions<InputDisplay, OutputDisplay> & {
  api?: never;
} & SomethingTakingADisplayTransformers<InputDisplay, OutputDisplay>;

type ConstructorOptions<InputDisplay extends Display, OutputDisplay extends ModernDisplay> =
  | ConstructorOptionsWithApi<InputDisplay, OutputDisplay>
  | ConstructorOptionsWithoutAPI<InputDisplay, OutputDisplay>;

/**
 * Type for the private properties that are shared between the different exported search SDK wrapper functions.
 * SDK users are not allowed to change/access these, they're an internal implementation detail.
 */
type PrivateProperties = {
  /**
   * What version of the modal is used for a given DepictSearch instance.
   */
  modalVersionUsed_: 1 | 2;
  depict_api_: DepictAPI<any>;
  search_query_url_param_name_: string;
  reset_history_state_: VoidFunction;
  router_: PseudoRouter;
  url_transformer_: undefined | ((url_object: URL) => unknown);
  enable_category_suggestions_: boolean;
  search_page_aligned_modal_alignment_signals_?: ModalAlignmentSignals;
  clear_filters_on_next_submit_: (user_triggered: boolean) => void;
  configured_submit_query_: VoidFunction;
  get_search_query_: Accessor<string>;
  search_query_updating_blocked_: Signal<boolean>;
  i18n_: solid_search_i18n;
  current_sorting_: Signal<SortModel | undefined>;
  BackIcon_: () => JSX.Element;
  selected_filters_: Signal<FilterWithData[]>;
  state_: {
    field_value: Signal<string>;
    filters_open: Signal<boolean>;
    sorting_open: Signal<boolean>;
    expanded_filters: Signal<{ section_: string; expanded_: boolean }[]>;
    local_filter_cache: Signal<SearchFilter[]>;
    expanded_hierarchical_filters: Signal<{ value_: string[]; expanded_: boolean }[]>;
    showing_recommendation_rows: Signal<number>;
    content_results_rows: Signal<number>;
    scroll_restoration_data: Signal<ScrollRestorationData>;
  };
};

export type OpenModalArguments = [
  options_for_modal?: {
    alignmentSignals_?: ModalAlignmentSignals;
    closing_animation_?: () => Promise<any>;
    setSearchFieldOuterWidth_?: Setter<number>;
    class_list_?: Accessor<Record<string, boolean>>;
    selected_text_range_?: readonly [number | null, number | null] | [number | null, number | null];
    dont_sync_search_field_value_except_on_submit_?: boolean;
    forceUseDiv_?: boolean;
  },
  on_dispose?: VoidFunction,
];

/**
 * Type for the private properties that are shared between the different exported search SDK wrapper functions. SDK users are not allowed to change/access these, they're an internal implementation detail.
 */
export const privately_shared_properties = /*@__PURE__*/ new WeakMap<DepictSearch<any>, PrivateProperties>();
const content_search_default = true;
const min_products_to_fetch_ = 20;
export const get_search_query_updating_blocked_signal = (
  depict_search: DepictSearch<any> // don't expose the whole privately_shared_properties but enable this to be changed
) => privately_shared_properties.get(depict_search)?.search_query_updating_blocked_;

export class DepictSearch<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = InputDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<InputDisplay>
    : never,
> {
  #locale_signal = createSignal<search_i18n>();
  #merchant_signal = createSignal<string>();
  #market_signal = createSignal<string>();
  #modal_open_signal = createSignal<OpenModalArguments | boolean>(false);
  #content_search_signal = createSignal<boolean | undefined>();
  static #keys_constructed_with = /*@__PURE__*/ new Set<string>();

  #router = new PseudoRouter("hard_navigation");

  constructor({
    unique_instance_key_for_state = "",
    search_query_url_param_name: search_query_url_param_name_ = "query" + unique_instance_key_for_state,
    url_transformer,
    on_navigation,
    enable_category_suggestions = true,
    display_transformers,
    api,
    searchModalComponent,
    // Stuff needed for non-standard customer deployments that we shouldn't actually expose
    disable_scrolling_during_modal = true,
    bottom_distance_under_modal,
    override_modal_element,
    ...props_on_class
  }: ConstructorOptions<InputDisplay, OutputDisplay>) {
    const owner = getOwner() || createRoot(() => getOwner()!); // we might have an owner, if so, pass it on. Otherwise, create one so solid doesn't print warnings to the console

    runWithOwner(owner, () => {
      if (DepictSearch.#keys_constructed_with.has(unique_instance_key_for_state) && !isServer) {
        // on the server we can't write stuff to history.state anyway so can have multiple
        throw new Error("You can only have one instance of DepictSearch with the same uniqueInstanceKeyForState");
      }
      const modalVersion = searchModalComponent[modalVersionSymbol] as 1 | 2;
      const BackIcon_ = searchModalComponent[backIconSymbol] as () => JSX.Element;
      if (!modalVersion || !BackIcon_) {
        throw new Error("Unrecognized search modal component, make sure symbols are set");
      }
      Object.assign(this, props_on_class);
      if (on_navigation) this.#router.on_navigation_ = on_navigation;

      const sorting_query_param_ = "sorting" + unique_instance_key_for_state;
      const filter_query_param_prefix_ = "f" + unique_instance_key_for_state + "_";
      const {
        current_sorting_,
        selected_filters_,
        search_query_accessor_: raw_search_query_accessor,
      } = url_state({
        search_query_url_param_name_,
        router_: this.#router,
        sorting_query_param_,
        filter_query_param_prefix_,
      });
      const [reset_history_state_, state_] = make_resettable_history_state({
        get_default_values_: () => ({
          field_value:
            (globalThis?.location && new URLSearchParams(location.search).get(search_query_url_param_name_)) ?? "",
          filters_open: false,
          sorting_open: false,
          expanded_filters: [],
          // Please make sure that the signal created by below line always updates AFTER selected_filters_ updates on a "popstate" event. If the filter cache is popped before the selected filters are the code in create_modified_filters() is going to re-calculate search_local_filter_cache without knowing the real value of search_selected_filters, and we'll end up with too few filters in search_local_filter_cache in some cases
          local_filter_cache: [],
          expanded_hierarchical_filters: [],
          showing_recommendation_rows: search_recommendation_start_rows,
          content_results_rows: content_results_start_rows,
          scroll_restoration_data: [],
        }),
        router_: this.#router,
        prefix_: "search" + unique_instance_key_for_state + "_",
      });
      const search_query_updating_blocked_ = createSignal(false);
      const [get_search_query_updating_blocked] = search_query_updating_blocked_;
      const get_search_query_ = createMemo<string>(previous_value => {
        if (get_search_query_updating_blocked()) {
          return previous_value as string;
        } else {
          return raw_search_query_accessor();
        }
      });
      // @ts-ignore
      const depict_api_ = api ?? new DepictAPI({ display_transformers });

      const previous_searches = make_previous_searches_signal(get_search_query_);
      const [, set_search_showing_recommendation_rows] = state_.showing_recommendation_rows;
      const [, set_search_content_results_rows] = state_.content_results_rows;
      const after_submit_ = () => {
        set_search_showing_recommendation_rows(search_recommendation_start_rows);
        set_search_content_results_rows(content_results_start_rows);
      }; // do this every time after we have submitted a new query - otherwise there might already be a saved number of rows in the state
      const on_submit_with_unchanged_value_ = () => (this.modal_open = false);
      const [get_search_field_value_, set_search_field_value_] = state_.field_value;
      const configured_submit_query_ = (new_query?: string) =>
        submit_query_handler({
          on_submit_with_unchanged_value_,
          set_search_field_value_,
          get_search_query_,
          search_param_name_: search_query_url_param_name_,
          after_submit_,
          get_new_query: () => new_query || untrack(get_search_field_value_),
          url_transformer_: url_transformer,
          router_: this.#router,
        });

      const i18n_ = accessor_of_object_to_object_with_accessor_values(this.#locale_signal[0] as Accessor<search_i18n>);
      const clear_filters_on_next_submit_ = filter_clearing_helper_factory({
        selected_filters_,
        get_search_query_,
        current_sorting_,
        expanded_hierarchical_filters_: state_.expanded_hierarchical_filters,
        i18n_,
        local_filter_cache_: state_.local_filter_cache,
        expanded_filters_: state_.expanded_filters,
        filters_open_: state_.filters_open,
      });

      privately_shared_properties.set(this, {
        search_query_url_param_name_,
        reset_history_state_,
        state_,
        router_: this.#router,
        url_transformer_: url_transformer,
        depict_api_,
        enable_category_suggestions_: enable_category_suggestions,
        clear_filters_on_next_submit_,
        configured_submit_query_,
        get_search_query_,
        i18n_,
        search_query_updating_blocked_,
        current_sorting_,
        selected_filters_,
        modalVersionUsed_: modalVersion,
        BackIcon_,
      });

      preserve_items_in_history_dot_state();

      catchify(async () => {
        const { open_modal_, close_modal_ } = await modal_opener(
          (...args) => {
            onCleanup(() => (this.modal_open = false));
            return searchModalComponent(...args);
          },
          {
            search_field_value_: state_.field_value,
            get_search_query_,
            search_query_url_param_name_,
            previous_searches_: previous_searches,
            depict_api_: depict_api_,
            merchant_: this.#merchant_signal[0] as Accessor<string>,
            clear_filters_: clear_filters_on_next_submit_,
            market_: this.#market_signal[0] as Accessor<string>,
            submit_query_: configured_submit_query_,
            url_transformer_: url_transformer,
            router_: this.#router,
            sorting_query_param_,
            filter_query_param_prefix_,
            content_search_enabled_: () => this.#content_search_signal[0]() ?? content_search_default,
            instant_results_options_: {
              min_products_to_fetch_,
              has_sort_or_filters_: createMemo(
                () => !!(Object.keys(selected_filters_[0]())?.length || current_sorting_[0]())
              ),
            } as const,
            i18n_,
            enable_category_suggestions_: enable_category_suggestions,
            disable_scrolling_: disable_scrolling_during_modal,
            bottom_distance_under_modal_: bottom_distance_under_modal,
          },
          override_modal_element
        );

        // This will add some default behaviour to open_modal_ if no style_props_ are supplied
        // The default behaviour is to align the modal with the input field if possible

        const modal_opening_effect = () => {
          const open_signal_value = this.modal_open;
          const signal_value_is_options = Array.isArray(open_signal_value);
          // Close modal if signal is false
          if (!open_signal_value) {
            close_modal_();
            return;
          }
          const { search_page_aligned_modal_alignment_signals_ } = privately_shared_properties.get(this)!;
          if (signal_value_is_options && open_signal_value[0]?.alignmentSignals_) {
            // They know what they're doing, just call the modal with the provided options
            (open_modal_ as (...args: OpenModalArguments) => void)(...open_signal_value);
            return;
          }
          if (
            !(open_signal_value as OpenModalArguments)[0]?.alignmentSignals_ &&
            search_page_aligned_modal_alignment_signals_
          ) {
            // Open modal aligned with search page if no alignment specified and possible to align with search page
            const [options_arg, ...rest] =
              open_signal_value === true ? ([{}] as OpenModalArguments) : open_signal_value;
            const closingAnimation = setupDefaultAnimations(search_page_aligned_modal_alignment_signals_, modalVersion);
            (open_modal_ as (...args: OpenModalArguments) => void)(
              {
                closing_animation_: closingAnimation,
                ...options_arg,
                alignmentSignals_: search_page_aligned_modal_alignment_signals_,
              },
              ...rest
            );
            return;
          }

          // Open centered modal
          const centeredModalAlignmentSignals = center_modal_style_props();
          const closingAnimation = setupDefaultAnimations(centeredModalAlignmentSignals, modalVersion);
          if (signal_value_is_options) {
            const [options_arg, ...rest] = open_signal_value;
            (open_modal_ as (...args: OpenModalArguments) => void)(
              {
                closing_animation_: closingAnimation,
                ...options_arg,
                alignmentSignals_: search_page_aligned_modal_alignment_signals_ || centeredModalAlignmentSignals,
              },
              ...rest
            );
            return;
          }
          (open_modal_ as (...args: OpenModalArguments) => void)({
            alignmentSignals_: centeredModalAlignmentSignals,
            closing_animation_: closingAnimation,
          });
        };

        runWithOwner(owner, () => createEffect(modal_opening_effect));
      })();

      DepictSearch.#keys_constructed_with.add(unique_instance_key_for_state);
      onCleanup(() => DepictSearch.#keys_constructed_with.delete(unique_instance_key_for_state));
    });
  }

  get enable_content_search() {
    return this.#content_search_signal[0]();
  }
  set enable_content_search(new_state: boolean | undefined) {
    this.#content_search_signal[1](new_state);
  }
  get on_navigation() {
    // The only non-reactive public property on the class (I don't see it making sense to have it reactive)
    return this.#router.on_navigation_;
  }
  set on_navigation(new_function: OnNavigation) {
    this.#router.on_navigation_ = new_function;
  }
  get localization() {
    // allow reactive access
    return this.#locale_signal[0]()!;
  }
  set localization(locale_obj: search_i18n) {
    if (typeof locale_obj === "string") {
      // Prevent people not using typescript from accidentally passing a string instead of an object, see https://depictaiworkspace.slack.com/archives/C04RF3KTK0A/p1707211551951239
      throw new Error("locale must be an object, see the TypeScript definitions");
    }
    this.#locale_signal[1](locale_obj);
  }
  get modal_open() {
    return this.#modal_open_signal[0]();
  }
  set modal_open(new_state: OpenModalArguments | boolean) {
    this.#modal_open_signal[1](new_state);
  }
  get merchant() {
    return this.#merchant_signal[0]()!;
  }
  set merchant(tenant: string) {
    this.#merchant_signal[1](tenant);
  }
  get market() {
    return this.#market_signal[0]()!;
  }
  set market(market: string) {
    this.#market_signal[1](market);
  }

  async fetchSearchResults(
    query: string,
    filters?: SearchFilter[],
    maxResults = 48
    // Without the tuple notation this doesn't work for some reason
  ) {
    const { depict_api_ } = privately_shared_properties.get(this)!;

    const result = await depict_api_.query({
      merchant: this.merchant,
      market: this.market,
      query,
      filters,
      limit: maxResults,
      locale: this.localization.backend_locale_,
    });

    if (result.failed) {
      throw new Error("Failed to fetch search results");
    }

    return result.displays as ([OutputDisplay] extends [never]
      ? InputDisplay
      : ModernDisplayWithPageUrl<OutputDisplay>)[];
  }
}

/**
 * Gets private properties that are shared between the different exported search SDK wrapper functions. SDK users are not allowed to change/access these, they're an internal implementation detail.
 * Only access this in exported SDK functions.
 * @param depict_search The DepictSearch instance to get the shared properties for
 */
export function get_shared_search_properties(depict_search: DepictSearch<any>) {
  const shared_properties = privately_shared_properties.get(depict_search);
  if (!shared_properties) {
    throw new Error("Can't connect to provided DepictSearch instance");
  }
  return shared_properties;
}

/**
 * This is the SearchPage component visible outside - exported from @depict-ai/ui.
 * It wraps the internal, pure SearchPage component and connects it to the DepictSearch instance and other global state such as the history or page URL.
 * It is wrapped once again in the js-ui and react-ui packages which exports the final, most simplified interface.
 */
export function SDKSearchPageComponent<
  OriginalDisplay extends Display,
  TransformedDisplay extends never | ModernDisplay,
>(props: {
  depict_search: DepictSearch<OriginalDisplay, TransformedDisplay>;
  include_input_field?: boolean | { on_open_?: VoidFunction; on_close_?: VoidFunction }; // <- reactive
  grid_spacing: SDKGridSpacing; // <- reactive
  cols_at_size: SDKColsAtSize; // <- reactive
  product_card_template: ProductCardTemplate<
    // Without the tuple notation this doesn't work for some reason
    [TransformedDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<TransformedDisplay>
  >;
  content_blocks_by_row?: ContentBlocksByRow;
  on_query_change?: (new_query?: string | undefined, old_query?: string | undefined) => void;
  // Stuff needed for non-standard customer deployments that we shouldn't actually expose
  filterModalParent_?: HTMLElement | ShadowRoot; // Needed by style editor in shopify plugin
  class?: string;
  showSliderArrow_?: boolean;
  hideCount0FilterOptions_?: boolean; // <- reactive
  switchToFiltersDrawerBreakpoint_?: number | undefined; // <- reactive
}) {
  const { depict_search, product_card_template } = props;
  const shared_properties = get_shared_search_properties(depict_search);

  return run_in_root_or_auto_cleanup(() => {
    const { state_ } = shared_properties;
    const grid_spacing_override = createMemo(() => {
      const { grid_spacing } = props; // can be reactive
      return typeof grid_spacing === "string"
        ? { grid_spacing }
        : { override_vertical_spacing: grid_spacing.vertical, grid_spacing: grid_spacing.horizontal };
    });

    createEffect<string | undefined>(prev => {
      // this is here (and not on DepictSearch) so that people also know when PageReplacer removes the page, it's intended to help people replace their own content when a depict page is navigated, see https://depictaiworkspace.slack.com/archives/C04M8MGCF3K/p1691670636155369
      const search_query = shared_properties.get_search_query_();
      throw_globally(props.on_query_change)(search_query, prev);
      return search_query;
    });
    onCleanup(() => throw_globally(props.on_query_change)());
    onCleanup(shared_properties.reset_history_state_);

    return SearchPage<Exclude<Parameters<typeof product_card_template>[0], null>>({
      input_modal_open_: () => !!depict_search.modal_open,
      tenant_: () => depict_search.merchant,
      market_: (() => depict_search.market) as Accessor<string>,
      depict_api_: shared_properties.depict_api_,
      BackIcon_: shared_properties.BackIcon_,
      min_products_to_fetch_,
      local_filter_cache_: state_.local_filter_cache,
      content_search_enabled_: () => depict_search.enable_content_search ?? content_search_default,
      search_field_value_: state_.field_value,
      get_search_query_: shared_properties.get_search_query_,
      clear_filters_on_next_submit_: shared_properties.clear_filters_on_next_submit_,
      open_modal_: (...args) => (depict_search.modal_open = args),
      submit_query_: shared_properties.configured_submit_query_,
      modalVersionUsed_: shared_properties.modalVersionUsed_,
      showSliderArrow_: () => props.showSliderArrow_,
      i18n_: shared_properties.i18n_,
      modalAlignmentSignalsRef_: style => {
        const shared_info_right_now = privately_shared_properties.get(depict_search);
        if (!shared_info_right_now) return;
        privately_shared_properties.set(depict_search, {
          ...shared_info_right_now,
          search_page_aligned_modal_alignment_signals_: style,
        });
        onCleanup(() => {
          const shared_info_right_now = privately_shared_properties.get(depict_search);
          if (!shared_info_right_now || shared_info_right_now.search_page_aligned_modal_alignment_signals_ !== style)
            return;
          privately_shared_properties.set(depict_search, {
            ...shared_info_right_now,
            search_page_aligned_modal_alignment_signals_: undefined,
          });
        });
      },
      current_sorting_: shared_properties.current_sorting_,
      search_filters_open_: state_.filters_open,
      search_sorting_open_: state_.sorting_open,
      expanded_filters_: state_.expanded_filters,
      content_results_rows_: state_.content_results_rows,
      switchToFiltersDrawerBreakpoint_: () => props.switchToFiltersDrawerBreakpoint_,
      content_blocks_by_row_: () => props.content_blocks_by_row,
      router_: shared_properties.router_,
      make_category_suggestion_card_: shared_properties.enable_category_suggestions_
        ? category_suggestion_ => {
            return GenericCategorySuggestionCard({
              category_suggestion_,
              router_: shared_properties.router_,
            });
          }
        : false,
      expanded_hierarchical_filters_: state_.expanded_hierarchical_filters,
      selected_filters_: shared_properties.selected_filters_,
      showing_recommendation_rows_: state_.showing_recommendation_rows,
      scroll_restoration_data_: state_.scroll_restoration_data,
      include_input_field_: () => props.include_input_field,
      layout_options_: createMemo(() => ({
        cols_at_size: convert_sdk_cols_at_size_to_layout(props.cols_at_size),
        ...grid_spacing_override(),
      })),
      content_layout_options_: createMemo(() => ({
        cols_at_size: convert_sdk_cols_at_size_to_layout(limit_cols_at_size_for_content_results(props.cols_at_size)),
        ...grid_spacing_override(),
      })),
      filterModalParent_: untrack(() => props.filterModalParent_),
      product_card_template_: product_card_template,
      class_: () => props.class,
      hideCount0FilterOptions_: () => props.hideCount0FilterOptions_ ?? false,
    });
  }, "Entire SearchPage failed");
}
