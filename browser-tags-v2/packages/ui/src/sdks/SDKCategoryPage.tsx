import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { ProductCardTemplate, SDKGridSpacing } from "../shared/types";
import {
  convert_sdk_cols_at_size_to_layout,
  SDKColsAtSize,
} from "../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";
import { ModernDisplayWithPageUrl } from "../shared/display_transformer_types";
import { CategoryTitle } from "../category_listing/components/CategoryTitle";
import { embedded_num_products } from "../category_listing/helpers/embedded_num_products";
import { ListingQuery, PossibleLayout } from "./types";
import { ContentBlocksByRow } from "../shared/components/PLPResults/create_content_blocks";
import { Accessor, createComputed, createEffect, createMemo, onCleanup, untrack } from "solid-js";
import { run_in_root_or_auto_cleanup } from "../shared/helper_functions/run_in_root_or_auto_cleanup";
import { throw_globally } from "../shared/helper_functions/throw_globally";
import { CategoryPage } from "../category_listing/CategoryPage";
import * as IdTypes from "../category_listing/IdTypes";
import { DepictCategory, get_shared_category_properties } from "./category_listing";

const min_products_to_fetch_ = 20;

/**
 * This is the CategoryPage component visible outside - exported from @depict-ai/ui.
 * It wraps the internal, pure CategoryPage component and connects it to the DepictCategory instance and other global state such as the history or page URL.
 * It is wrapped once again in the js-ui and react-ui packages which exports the final, most simplified interface.
 */
export function SDKCategoryPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>(props: {
  depict_category: DepictCategory<OriginalDisplay, OutputDisplay>;
  grid_spacing: SDKGridSpacing; // <- reactive
  cols_at_size: SDKColsAtSize; // <- reactive
  product_card_template: ProductCardTemplate<
    // Without the tuple notation this doesn't work for some reason
    [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
  >;
  switchToFiltersDrawerBreakpoint_?: number | undefined; // <- reactive
  show_quicklinks?: boolean; // <- reactive
  show_breadcrumbs?: boolean; // <- reactive
  category_title: typeof CategoryTitle | typeof embedded_num_products;
  on_listing_query_change?: (
    new_listing_query?: ListingQuery | undefined,
    old_listing_query?: ListingQuery | undefined
  ) => void;
  content_blocks_by_row?: ContentBlocksByRow; // <- reactive
  layout?: PossibleLayout; // <- reactive
  filterModalParent_?: HTMLElement | ShadowRoot; // Needed by style editor in shopify plugin
  showSliderArrow_?: boolean;
  hideCount0FilterOptions_?: boolean; // <- reactive
}) {
  const { depict_category, product_card_template, category_title } = props;

  const shared_properties = get_shared_category_properties(depict_category);
  const diffableListingQuery = createMemo(() => Object.values(depict_category.listing_query || {}).join(""));

  return run_in_root_or_auto_cleanup(() => {
    createEffect<ListingQuery | undefined>(prev => {
      // this is here (and not on DepictCategory) so that people also know when PageReplacer removes the page, it's intended to help people replace their own content when a depict page is navigated, see https://depictaiworkspace.slack.com/archives/C04M8MGCF3K/p1691670636155369
      diffableListingQuery(); // Only re-run this effect when the listing query *actually* changes (not just the object reference)
      const newId = untrack(() => depict_category.listing_query);
      throw_globally(props.on_listing_query_change)(newId, prev);
      return newId;
    });
    onCleanup(() => throw_globally(props.on_listing_query_change)());

    const is_grid = createMemo(() => {
      const { layout } = props;
      return !layout || layout === "grid";
    });
    const grid_spacing_override = createMemo(() => {
      const { grid_spacing } = props; // can be reactive, therefore read in the memo
      return typeof grid_spacing === "string"
        ? { grid_spacing }
        : { override_vertical_spacing: grid_spacing.vertical, grid_spacing: grid_spacing.horizontal };
    });
    const {
      local_filter_cache: local_filter_cache_,
      filters_open: category_filters_open_,
      sorting_open: category_sorting_open_,
      expanded_filters: expanded_filters_,
      expanded_hierarchical_filters: expanded_hierarchical_filters_,
      scroll_restoration_data: scroll_restoration_data_,
      history_content_blocks: history_content_blocks_,
    } = depict_category.historyStateSignals_;
    const {
      current_sorting_,
      selected_filters_,
      override_listing_id_accessor_,
      reset_history_state_,
      depict_api_,
      i18n_,
      router_,
      breadcrumb_signal_,
      quicklinks_signal_,
      sideways_filter_clearing_flag_,
      sorting_query_param_,
      filter_query_param_prefix_,
    } = shared_properties;
    onCleanup(reset_history_state_);

    return CategoryPage<Exclude<Parameters<typeof product_card_template>[0], null>>({
      merchant_: () => depict_category.merchant,
      market_: (() => depict_category.market) as Accessor<string>,
      depict_api_,
      min_products_to_fetch_,
      local_filter_cache_,
      id_to_query_for_: createMemo(
        () =>
          (!depict_category.disable_override_listing_id && override_listing_id_accessor_()) ||
          depict_category.listing_query.id
      ),
      id_type_: createMemo(() => {
        if (!depict_category.disable_override_listing_id && override_listing_id_accessor_()) {
          return IdTypes.LISTING_ID;
        }
        return depict_category.listing_query.type;
      }),
      i18n_,
      // default disable quicklinks and breadcrumbs for sliders
      show_quicklinks_: createMemo(() => props.show_quicklinks ?? is_grid()),
      category_title_: category_title,
      show_breadcrumbs_: createMemo(() => props.show_breadcrumbs ?? is_grid()),
      current_sorting_,
      router_,
      get_breadcrumb_accessor_: accessor => createComputed(() => breadcrumb_signal_[1](accessor())),
      get_quicklinks_accessor_: accessor => createComputed(() => quicklinks_signal_[1](accessor())),
      category_filters_open_,
      category_sorting_open_,
      expanded_filters_,
      expanded_hierarchical_filters_,
      filterModalParent_: untrack(() => props.filterModalParent_),
      selected_filters_,
      sideways_filter_clearing_flag_,
      content_blocks_by_row_: () => props.content_blocks_by_row,
      showSliderArrow_: () => props.showSliderArrow_,
      hideCount0FilterOptions_: () => props.hideCount0FilterOptions_ ?? false,
      scroll_restoration_data_,
      history_content_blocks_,
      layout_options_: createMemo(() => ({
        cols_at_size: convert_sdk_cols_at_size_to_layout(props.cols_at_size),
        ...grid_spacing_override(),
        layout: props.layout,
      })),
      product_card_template_: product_card_template,
      sorting_query_param_,
      filter_query_param_prefix_,
      switchToFiltersDrawerBreakpoint_: () => props.switchToFiltersDrawerBreakpoint_,
    });
  }, "Entire CategoryPage failed");
}
