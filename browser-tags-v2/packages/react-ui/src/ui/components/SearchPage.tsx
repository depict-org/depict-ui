import { createComputed, createEffect, createMemo, JSX as solid_JSX, onCleanup, untrack } from "solid-js";
import { ReactPortal } from "react";
import { derror, Display, ModernDisplay } from "@depict-ai/utilishared";
import {
  BaseSearchPageConfig,
  defaultColsAtSize,
  defaultGridSpacing,
  get_search_query_updating_blocked_signal,
  ModernDisplayWithPageUrl,
  SearchPage as OrigSearchPage,
} from "@depict-ai/ui";
import { globalState } from "../../global_state";
import { is_search_page, set_run_on_href_change, wrap_solid_in_react } from "../../util";
import { PLPConfig, ReactContentBlocksByRow } from "../../types";
import { get_instance_and_track_component } from "../../helpers/get_instance_and_track_component";
import { render_display_or_block_from_react_template } from "../../helpers/render_display_or_block_from_react_template";
import { solidify_content_blocks_by_row } from "../../helpers/solidify_content_blocks_by_row";
import { SolidShowComponentAfterStateSet } from "../../helpers/SolidShowComponentAfterStateSet";

const rendered_components_with_state_key = new Set<string | undefined>();

export interface SearchPageConfig<T extends Display> extends BaseSearchPageConfig, PLPConfig<T> {
  /**
   * When using multiple search instances on the same page, you need to set a unique stateKey for each one. We recommend using an incrementing number, such as "1", "2", "3", etc. To associate a modal with a SearchPage keyed component, set the same stateKey on both. If no stateKey is provided, the "default" instance will be used.
   */
  stateKey?: string;
  /**
   * See JSDoc of ReactContentBlocksByRow
   */
  contentBlocksByRow?: ReactContentBlocksByRow;
}

/**
 * SearchPage is a component that renders a Depict search results page.
 * @param props - The props for the search page. Go to definition for more info.
 *
 * @example
 * ```tsx
 * import { DepictProductCard, ImagePlaceholder, Display, SearchPage } from '@depict-ai/react-ui'
 *
 * function Search() {
 *    return <SearchPage productCard={MyCustomSearchProductCard} />
 * }
 *
 * interface MyCustomDisplay extends Display {}
 *
 * export const MyCustomSearchProductCard: DepictProductCard<MyCustomDisplay> = ({
 *   display,
 * }) => {
 *   if (!display) {
 *     return <ImagePlaceholder aspectRatio={3 / 4} />
 *   }
 *
 *   return (
 *     <>
 *       <MyCustomProductCard
 *         product={{
 *           id: display.product_id,
 *           name: display.title,
 *           description: display.title,
 *           images: [{ url: display.image_url }],
 *           price: {
 *             value: display.sale_price,
 *           },
 *         }}
 *       />
 *     </>
 *   )
 * }
 *
 * ```
 */
export function SearchPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>(
  props: SearchPageConfig<
    // Without the tuple notation this doesn't work for some reason
    [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
  >
) {
  return wrap_solid_in_react<typeof props>({
    solid_component: (...args) => {
      // Work around some kind of babel bug where an optimisation turns ...args into `arguments` in the ES10 build which becomes the wrong arguments when read from teh getter
      const ourArguments = args;
      return <SolidShowComponentAfterStateSet>{SolidSearchPage(...ourArguments)}</SolidShowComponentAfterStateSet>;
    },
    props: props,
  });
}

function SolidSearchPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>(
  props: SearchPageConfig<
    // Without the tuple notation this doesn't work for some reason
    [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
  >,
  set_portals: (portals: ReactPortal[]) => void
) {
  const depict_search = createMemo(() => {
    const instance = get_instance_and_track_component("search", props.stateKey, "SearchPage");
    onCleanup(() => {
      // Make sure we don't block the search query updating signal when we switch to a new provider instance
      get_search_query_updating_blocked_signal(instance)?.[1](false);
    });
    return instance;
  });
  const update_updating_blocked_signal = () => {
    // if search instances changes, also re-check for good measure (otherwise would have untrack around depict_search)
    const signal = get_search_query_updating_blocked_signal(depict_search());
    if (!signal) {
      throw Error("No search_query_updating_blocked_signal when rendering SearchPage");
    }
    const [, write_signal] = signal;
    // This causes a bug. To reproduce:
    // 1. Go to front page
    // 2. Make a search
    // 3. Press back button
    // 4. Open search modal
    // 5. Check the list of previous queries - the query just made isn't shown
    // This is because on the front page the search_query updating is blocked because it's not the search page, and that means that `filtered_previous_searches` in Autocomplete.tsx doesn't filter out the current search query
    // Because it's so minor and would be quite hard to fix (one would need a second "actual search query" signal just for this purpose) it's wontfix for now
    // EDIT: now that we're resetting this in the onCleanup of the memo above this might no longer be the case
    write_signal(!is_search_page(location));
  };
  const [, set_search_page_in_dom] = globalState.search_page_in_dom;
  const component_portals = new Set<ReactPortal>();

  // We should only get here once react already has a DOM node which means we should be in the DOM
  set_search_page_in_dom(true);
  onCleanup(() => set_search_page_in_dom(false));

  // react is really slow with disposing components, we want to avoid a flash of another search query when you click on a product and navigate away
  set_run_on_href_change(update_updating_blocked_signal); // if we navigate, re-check
  createComputed(() => {
    globalState.search_page_path_[0](); // if react defined path changes, re-check
    update_updating_blocked_signal();
  });

  search_page_path_checker();

  return createMemo(() => {
    const stateKey = untrack(() => props.stateKey);
    if (rendered_components_with_state_key.has(stateKey)) {
      throw new Error(
        `You have multiple SearchPage components with the same stateKey: ${stateKey}. Each SearchPage component must have a unique stateKey.`
      );
    }
    const transformed_content_blocks = solidify_content_blocks_by_row(
      () => props.contentBlocksByRow,
      component_portals,
      set_portals
    );
    rendered_components_with_state_key.add(stateKey);
    onCleanup(() => rendered_components_with_state_key.delete(stateKey));

    return OrigSearchPage<OriginalDisplay, OutputDisplay>({
      // Default config goes here
      get include_input_field() {
        return props.includeInputField;
      },
      get cols_at_size() {
        return props.columnsAtSize ?? defaultColsAtSize;
      },
      get grid_spacing() {
        return props.gridSpacing ?? defaultGridSpacing;
      },
      get hideCount0FilterOptions_() {
        return props.hideCount0FilterOptions;
      },
      depict_search: depict_search(),
      product_card_template: (display, info) =>
        render_display_or_block_from_react_template({
          component_props: { display },
          get_react_template: () => props.productCard,
          component_portals,
          set_portals,
          set_on_index_change_: info?.set_on_index_change,
        }),
      get content_blocks_by_row() {
        return transformed_content_blocks();
      },
      get switchToFiltersDrawerBreakpoint_() {
        return props.switchToFiltersDrawerBreakpoint;
      },
    });
  }) as unknown as solid_JSX.Element;
}

/**
 * Users often set the searchPagePath to something without the market which breaks everything using the searchPagePath internally, notably refining the search query. Add a warning for them.
 */
function search_page_path_checker() {
  let has_warned = false;
  createEffect(() => {
    if (has_warned) return;
    const should_be_path = globalState.search_page_path_[0]();
    const { pathname } = location;
    if (
      // allow some variability just to be sure
      should_be_path !== pathname &&
      should_be_path + "/" !== pathname &&
      should_be_path !== pathname + "/"
    ) {
      derror(
        "searchPagePath is set to",
        should_be_path,
        "but the SearchPage is rendered at",
        pathname,
        ". Please double-check your searchPagePath is where the SearchPage component ends up being rendered, after all redirects, unless you're sure this is intentional."
      );
      has_warned = true;
    }
  });
}
