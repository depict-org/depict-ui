import { ListingSuggestionAfterURLCreator } from "../../../types";
import { Accessor, createMemo, For, Show } from "solid-js";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { setKeyboardNavigationEntry } from "../../../helper_functions/modal_keyboard_navigation_helpers";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../../../helper_functions/keyboard_navigation_types";
import { ListingCard } from "./ListingCard";
import { SlidableItems } from "../../../../shared/components/SlidableItems";
import { SolidLayoutWithProvidedElement } from "../../../../shared/components/SolidLayout";

/**
 * Shows the listing suggestions (formerly called category suggestions) visually, with lots of images and stuff
 * Destrcutures properties so make sure to pass accessors.
 */
export function VisualListingSuggestions({
  listing_suggestions_,
  filter_query_param_prefix_,
  sorting_query_param_,
  router_,
  i18n_,
  merchant_,
  itemIndex_,
  selected_index_,
  modalLayoutStacked_,
  showPlaceholders_,
  currently_showing_suggestions_: [, set_currently_showing_suggestions],
}: {
  listing_suggestions_: Accessor<undefined | ListingSuggestionAfterURLCreator[]>;
  router_: PseudoRouter;
  i18n_: solid_search_i18n;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  merchant_: Accessor<string>;
  itemIndex_: Accessor<number>;
  selected_index_: SelectedIndexType;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  modalLayoutStacked_: Accessor<boolean>;
  showPlaceholders_: Accessor<boolean>;
}) {
  const listings_by_id = createMemo(() =>
    Object.fromEntries((listing_suggestions_() || []).map(listing => [listing.listing_id, listing]))
  );
  const productCards = (
    <For each={showPlaceholders_() ? [, , ,] : Object.keys(listings_by_id())}>
      {(listingId, index) => {
        const listing = createMemo(() => (listingId == undefined ? undefined : listings_by_id()[listingId]));
        return (
          <ListingCard
            listing_={listing}
            i18n_={i18n_}
            router_={router_}
            sorting_query_param_={sorting_query_param_}
            filter_query_param_prefix_={filter_query_param_prefix_}
            merchant_={merchant_}
            keyboardNavigationGroupIndex_={itemIndex_}
            index_={index}
            selected_index_={selected_index_}
          />
        );
      }}
    </For>
  );
  setKeyboardNavigationEntry(
    set_currently_showing_suggestions,
    itemIndex_,
    createMemo(
      () =>
        listing_suggestions_()?.map(suggestion => ({ title_: suggestion.title, page_url_: suggestion.page_url })) || []
    )
  );

  return (
    <Show when={listing_suggestions_()?.length || showPlaceholders_()}>
      <div class="visual-listing-suggestions" style={{ order: itemIndex_() }}>
        <h2>{i18n_.listing_suggestions_()}</h2>
        <Show when={modalLayoutStacked_()} fallback={<div class="suggestion-container">{productCards}</div>}>
          <SlidableItems
            fadingThreshold_={0.5}
            snapAlign_="center"
            slider_ref_={slider => {
              const { insert_here, container } = slider;
              const Layout = (props: Parameters<typeof SolidLayoutWithProvidedElement>[0]) =>
                SolidLayoutWithProvidedElement(props, insert_here as HTMLDivElement, true);
              // Do like this, so we don't have to call mergeProps ourselves
              <Layout rows="all" layout="slider" grid_spacing="12px" cols_at_size={[[1.25, "0px"]]} />;
              container.classList.add("products");
            }}
          >
            {productCards}
          </SlidableItems>
        </Show>
      </div>
    </Show>
  );
}
