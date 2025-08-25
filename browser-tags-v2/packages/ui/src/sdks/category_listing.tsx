/** @jsxImportSource solid-js */
import { Accessor, createRoot, createSignal, getOwner, onCleanup, runWithOwner, Signal } from "solid-js";
import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { make_resettable_history_state } from "../shared/helper_functions/make_resettable_history_state";
import { category_i18n, solid_category_i18n } from "../locales/i18n_types";
import { DepictAPI } from "../shared/DepictAPI";
import { SearchFilter, SortModel } from "@depict-ai/types/api/ProductListingResponseV3";
import { preserve_items_in_history_dot_state } from "../shared/helper_functions/preserve_items_in_history_dot_state";
import { FilterWithData, ScrollRestorationData } from "../shared/types";
import { accessor_of_object_to_object_with_accessor_values } from "../shared/helper_functions/accessor_of_object_to_object_with_accessor_values";
import { url_state } from "../shared/url_state/url_state";
import { OnNavigation, PseudoRouter } from "../shared/helper_functions/pseudo_router";
import { isServer } from "solid-js/web";
import { ProductListingWithPageURL } from "../category_listing/types";
import { ModernDisplayWithPageUrl, SomethingTakingADisplayTransformers } from "../shared/display_transformer_types";
import { ListingQuery } from "./types";
import { ContentBlockHistoryState } from "../category_listing/helpers/useBackendContentBlocks";

type GeneralCategoryListingOptions = {
  market: string;
  merchant: string;
  localization: category_i18n;
  unique_instance_key_for_state?: string;
  on_navigation?: OnNavigation;
  listing_query_state_key?: string; // key provided by js-ui to store the listing_id in url_state
};

type CategoryConstructorOptionsWithApi<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = GeneralCategoryListingOptions & {
  api: DepictAPI<InputDisplay, OutputDisplay>;
} & { page_url_creator?: never; display_transformers?: never };

// We just pass page_url_creator to DepictAPI when we instantiate it, so don't allow it to be specified if api is already specified
type CategoryConstructorOptionsWithoutApi<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = GeneralCategoryListingOptions & {
  api?: never;
} & SomethingTakingADisplayTransformers<InputDisplay, OutputDisplay>;

type DepictCategoryConstructorOptions<InputDisplay extends Display, OutputDisplay extends ModernDisplay> =
  | CategoryConstructorOptionsWithApi<InputDisplay, OutputDisplay>
  | CategoryConstructorOptionsWithoutApi<InputDisplay, OutputDisplay>;

/**
 * Type for the private properties that are shared between the different exported search SDK wrapper functions.
 * SDK users are not allowed to change/access these, they're an internal implementation detail.
 */
type PrivateProperties = {
  depict_api_: DepictAPI<any>;
  i18n_: solid_category_i18n;
  breadcrumb_signal_: Signal<ProductListingWithPageURL[] | undefined>;
  quicklinks_signal_: Signal<ProductListingWithPageURL[] | undefined>;
  router_: PseudoRouter;
  reset_history_state_: VoidFunction;
  current_sorting_: Signal<SortModel | undefined>;
  selected_filters_: Signal<FilterWithData[]>;
  override_listing_id_accessor_: Accessor<string | null>;
  sideways_filter_clearing_flag_: Signal<boolean>;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
};

const privately_shared_properties = /*@__PURE__*/ new WeakMap<DepictCategory<any>, PrivateProperties>();

export class DepictCategory<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never = InputDisplay extends ModernDisplay
    ? ModernDisplayWithPageUrl<InputDisplay>
    : never,
> {
  /**
   * Used internally in @depict-ai/react-ui for `useCategoryFilterHelpers`. These are solid-js signals that contain the value of the state for this DepictCategory instance that's currently in history.state. Calling the setters updates history.state with history.replaceState.
   */
  historyStateSignals_: {
    filters_open: Signal<boolean>;
    sorting_open: Signal<boolean>;
    expanded_filters: Signal<{ section_: string; expanded_: boolean }[]>;
    local_filter_cache: Signal<SearchFilter[]>;
    expanded_hierarchical_filters: Signal<{ value_: string[]; expanded_: boolean }[]>;
    scroll_restoration_data: Signal<ScrollRestorationData>;
    history_content_blocks: Signal<ContentBlockHistoryState>;
  };
  /**
   * Signal representing the currently selected filters. Will update to always reflect the state of the current URL. Calling the setter triggers a navigation (replaceState) to an updated URL.
   */
  selectedFilters_: Signal<FilterWithData[]>;
  #router: PseudoRouter;
  #localization_signal = createSignal<category_i18n>();
  #merchant_signal = createSignal<string>();
  #market_signal = createSignal<string>();
  #listing_query_signal = createSignal<ListingQuery>({} as ListingQuery);
  #disable_override_listing_id = createSignal<boolean | undefined>();
  static #keys_constructed_with = /*@__PURE__*/ new Set<string>();
  get localization() {
    // allow reactive access
    return this.#localization_signal[0]()!;
  }
  set localization(locale_obj: category_i18n) {
    if (typeof locale_obj === "string") {
      // Prevent people not using typescript from accidentally passing a string instead of an object, see https://depictaiworkspace.slack.com/archives/C04RF3KTK0A/p1707211551951239
      throw new Error("locale must be an object, see the TypeScript definitions");
    }
    this.#localization_signal[1](locale_obj);
  }
  get listing_query() {
    return this.#listing_query_signal[0]();
  }
  set listing_query(query: ListingQuery) {
    this.#listing_query_signal[1](query);
  }
  get merchant() {
    return this.#merchant_signal[0]()!;
  }
  set merchant(merchant: string) {
    this.#merchant_signal[1](merchant);
  }
  get market() {
    return this.#market_signal[0]()!;
  }
  set market(market: string) {
    this.#market_signal[1](market);
  }
  get disable_override_listing_id() {
    return this.#disable_override_listing_id[0]();
  }
  set disable_override_listing_id(new_value: boolean | undefined) {
    this.#disable_override_listing_id[1](new_value);
  }
  get on_navigation() {
    // The only non-reactive public property on the class (I don't see it making sense to have it reactive)
    return this.#router.on_navigation_;
  }
  set on_navigation(new_function: OnNavigation) {
    this.#router.on_navigation_ = new_function;
  }
  constructor({
    api,
    on_navigation,
    display_transformers,
    unique_instance_key_for_state = "",
    listing_query_state_key,
    ...props_on_class
  }: DepictCategoryConstructorOptions<InputDisplay, OutputDisplay>) {
    const owner = getOwner() || createRoot(() => getOwner()!); // we might have an owner, if so, pass it on. Otherwise, create one so solid doesn't print warnings to the console

    runWithOwner(owner, () => {
      if (DepictCategory.#keys_constructed_with.has(unique_instance_key_for_state) && !isServer) {
        // on the server we can't write stuff to history.state anyway so can have multiple
        throw new Error("You can only have one instance of DepictCategory with the same uniqueInstanceKeyForState");
      }
      Object.assign(this, props_on_class); // set initial signal values
      preserve_items_in_history_dot_state();

      this.#router = new PseudoRouter("hard_navigation", listing_query_state_key);

      if (on_navigation) this.#router.on_navigation_ = on_navigation;

      const override_listing_id_query_param_names_ = ["listing_id_" + unique_instance_key_for_state, "listing_id"]; // If you're wondering why this is an array https://gitlab.com/depict-ai/depict.ai/-/merge_requests/7958#note_1511700842
      const sorting_query_param_ = "sorting" + unique_instance_key_for_state;
      const filter_query_param_prefix_ = "f" + unique_instance_key_for_state + "_";
      const { selected_filters_, current_sorting_, sideways_filter_clearing_flag_, override_listing_id_accessor_ } =
        url_state({
          router_: this.#router,
          sorting_query_param_,
          filter_query_param_prefix_,
          override_listing_id_query_param_names_,
        });
      const [reset_history_state_, state_] = make_resettable_history_state({
        get_default_values_: () =>
          ({
            filters_open: false,
            sorting_open: false,
            expanded_filters: [],
            // Please make sure that the signal created by below line always updates AFTER selected_filters_ updates on a "popstate" event. If the filter cache is popped before the selected filters are the code in create_modified_filters() is going to re-calculate search_local_filter_cache without knowing the real value of search_selected_filters, and we'll end up with too few filters in search_local_filter_cache in some cases
            local_filter_cache: [],
            expanded_hierarchical_filters: [],
            scroll_restoration_data: [],
            history_content_blocks: { blocks: [], aspectRatios: {} },
          }) as const,
        // Don't reset content block stuff when leaving category page as we need it for scroll restoration, same with scroll restoration data (actually a bit unsure if this is needed, I think it depends on if someone cleans up our elements before the location changes or after, and maybe some of the test flakyness we have seen is due to this not existing before?)
        preserveKeys_: ["history_content_blocks", "scroll_restoration_data"],
        router_: this.#router,
        prefix_: "category" + unique_instance_key_for_state + "_",
      });
      const i18n_ = accessor_of_object_to_object_with_accessor_values(
        this.#localization_signal[0] as Accessor<category_i18n>
      );

      this.historyStateSignals_ = state_;
      this.selectedFilters_ = selected_filters_;
      privately_shared_properties.set(this, {
        breadcrumb_signal_: createSignal(),
        quicklinks_signal_: createSignal(),
        i18n_,
        reset_history_state_,
        // @ts-ignore
        depict_api_: api ?? new DepictAPI({ display_transformers }),
        router_: this.#router,
        selected_filters_,
        current_sorting_,
        override_listing_id_accessor_,
        sideways_filter_clearing_flag_,
        sorting_query_param_,
        filter_query_param_prefix_,
      });

      DepictCategory.#keys_constructed_with.add(unique_instance_key_for_state);
      onCleanup(() => DepictCategory.#keys_constructed_with.delete(unique_instance_key_for_state));
    });
  }
}

/**
 * Gets private properties that are shared between the different exported category SDK wrapper functions. SDK users are not allowed to change/access these, they're an internal implementation detail.
 * Only access this in exported SDK functions (not the solid components).
 * @param depict_category The DepictCategory instance to get the shared properties for
 */
export function get_shared_category_properties(depict_category: DepictCategory<any>) {
  const shared_properties = privately_shared_properties.get(depict_category);
  if (!shared_properties) {
    throw new Error("Can't connect to provided DepictCategory instance");
  }
  return shared_properties;
}
