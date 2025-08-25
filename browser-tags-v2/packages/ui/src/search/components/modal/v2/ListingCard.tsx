import { Accessor, createMemo, For, JSX, Show } from "solid-js";
import { ListingSuggestionAfterURLCreator } from "../../../types";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import { solid_category_i18n, solid_search_i18n } from "../../../../locales/i18n_types";
import { SelectedIndexType } from "../../../helper_functions/keyboard_navigation_types";
import { catchify } from "@depict-ai/utilishared";
import * as IdTypes from "../../../../category_listing/IdTypes";
import {
  scrollIntoViewIfSelectedByKeyboardNavigation,
  useIsSelected,
} from "../../../helper_functions/modal_keyboard_navigation_helpers";
import { BreadCrumbs } from "../../../../category_listing/components/BreadCrumbs";
import { ListingProvider } from "../../../../shared/helper_functions/ListingContext";
import { ModernResponsiveContainedImage } from "../../../../shared/components/ModernResponsiveContainedImage";
import { ArrowRightIcon } from "../../../../shared/components/icons/ArrowRightIcon";
import { TextPlaceholder } from "../../../../shared/components/Placeholders/TextPlaceholder";

const aspectRatioWidthComponent = 400;
const aspectRatioHeightComponent = 200;
const listingSuggestionCollageAspectRatio = aspectRatioWidthComponent / aspectRatioHeightComponent;

/**
 * Shows a single listing suggestion. Destructures properties so make sure to pass accessors.
 */
export function ListingCard({
  listing_,
  router_,
  i18n_,
  filter_query_param_prefix_,
  sorting_query_param_,
  merchant_,
  keyboardNavigationGroupIndex_,
  index_,
  selected_index_: [read_selected_index_, write_selected_index_],
}: {
  listing_: Accessor<ListingSuggestionAfterURLCreator | undefined>;
  router_: PseudoRouter;
  i18n_: solid_category_i18n | solid_search_i18n;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  merchant_: Accessor<string>;
  keyboardNavigationGroupIndex_: Accessor<number>;
  index_: Accessor<number>;
  selected_index_: SelectedIndexType;
}) {
  const href = createMemo(() => listing_()?.page_url); // <- could be made reactive getter created in displayTransformers, read it in memo here since it might create computations (for example in the preview-brower), and there's no owner in the onClick handler
  const LinkToListing = (props: Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) => (
    <a
      {...props}
      href={href()}
      onClick={catchify(
        (ev: MouseEvent) =>
          href() &&
          router_.navigate_.go_to_({
            new_url_: href()!,
            is_replace_: false,
            event_: ev,
            listing_query_: { id: listing_()!.listing_id, type: IdTypes.LISTING_ID },
          })
      )}
    />
  );

  const image_urls = createMemo(() => listing_()?.image_urls?.slice(0, 3));
  const [isSelected, selectedDueToKeyboardNavigation] = useIsSelected(
    read_selected_index_,
    keyboardNavigationGroupIndex_,
    index_
  );
  const crumbData = createMemo(
    () =>
      listing_()?.ancestors as (ListingSuggestionAfterURLCreator["ancestors"][number] & {
        // This is a lie to get around python json schema generation bug type errors
        external_id: string;
        slug: string;
      })[]
  );

  return (
    <div
      class="listing-card"
      classList={{ selected: isSelected() }}
      aria-selected={isSelected()}
      onMouseOver={catchify(({ target }) => {
        // Using onMouseOver instead of onMouseEnter to also trigger when the hovered child changes
        const crumbsSelector = ".crumbs";
        if (target.matches(crumbsSelector) || target.closest(crumbsSelector)) {
          write_selected_index_();
          return;
        }
        write_selected_index_([keyboardNavigationGroupIndex_(), index_()]);
      })}
      onMouseLeave={catchify(() => write_selected_index_())}
      ref={element => scrollIntoViewIfSelectedByKeyboardNavigation(element, selectedDueToKeyboardNavigation)}
    >
      <LinkToListing class="image-part" style={`--image-count: ${image_urls()?.length ?? 0}`} tabIndex={-1}>
        {/* Don't make the first link keyboard selectable with tab, it works on the second one and we show an outline around the whole card when selecting the second one */}
        <div class="images-wrapper">
          <ListingSuggestionCollage image_urls_={image_urls} />
        </div>
      </LinkToListing>
      <Show when={crumbData()?.length !== 0}>
        <BreadCrumbs
          crumb_data_={crumbData}
          router_={router_}
          i18n_={i18n_}
          sorting_query_param_={sorting_query_param_}
          filter_query_param_prefix_={filter_query_param_prefix_}
          placeholderData_={[, ,]}
        />
      </Show>
      <h3 class="title">
        <LinkToListing>{listing_()?.title || <TextPlaceholder height="1em" width="15ch" />}</LinkToListing>
      </h3>
    </div>
  );
}

export function ListingSuggestionCollage({ image_urls_ }: { image_urls_: Accessor<string[] | undefined> }) {
  return (
    <Show when={image_urls_()?.length} fallback={<EmptyImage />}>
      <ListingProvider>
        <For each={image_urls_()}>
          {url => (
            <ModernResponsiveContainedImage
              src={url}
              aspectRatio={aspectRatioWidthComponent / image_urls_()!.length / aspectRatioHeightComponent}
              imgProps={{ style: "object-fit: cover;" }}
            />
          )}
        </For>
      </ListingProvider>
    </Show>
  );
}

function EmptyImage() {
  return (
    <div class="empty-image" style={{ "aspect-ratio": listingSuggestionCollageAspectRatio }}>
      <ArrowRightIcon />
    </div>
  );
}
