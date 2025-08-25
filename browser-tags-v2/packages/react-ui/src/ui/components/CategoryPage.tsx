import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { globalState } from "../../global_state";
import { ReactPortal } from "react";
import {
  BaseCategoryPageConfig,
  CategoryPage as OrigCategoryPage,
  CategoryTitle,
  defaultCategoryTitlePlugin,
  defaultColsAtSize,
  defaultGridSpacing,
  embedded_num_products as EmbeddedNumProducts,
  ListingQuery,
  ModernDisplayWithPageUrl,
} from "@depict-ai/ui";
import { wrap_solid_in_react } from "../../util";
import { PLPConfig, ReactContentBlocksByRow } from "../../types";
import { createComputed, createMemo, createSignal, JSX as solid_JSX, onCleanup, untrack } from "solid-js";
import { get_instance_and_track_component } from "../../helpers/get_instance_and_track_component";
import { render_display_or_block_from_react_template } from "../../helpers/render_display_or_block_from_react_template";
import { solidify_content_blocks_by_row } from "../../helpers/solidify_content_blocks_by_row";
import { SolidShowComponentAfterStateSet } from "../../helpers/SolidShowComponentAfterStateSet";

const rendered_components_with_state_key = new Set<string | undefined>();

export interface CategoryPageConfig<T extends Display> extends BaseCategoryPageConfig, PLPConfig<T> {
  /**
   * The listing to query Depict for. `type` can be `"listingId"` or `"externalId"`..
   * If `id` is `"listingId"`, it should be a uuid where Depict is the source of truth, you can get them here: https://api.depict.ai/docs#tag/Listing/operation/Get_Listings_v3_listings_get.
   * If `id` is `"externalId"`, it should be the id of the product listing in your system - whatever was passed to Depict during data ingestion.
   */
  listingQuery: ListingQuery;
  /**
   * categoryTitlePlugin is an optional plugin that can be used to customize the title of the category page.
   * @default CategoryTitle
   *
   * @example
   * ```tsx
   * <CategoryPage listingId="72909a4a-adf7-4355-b7be-f9090d4185db" productCard={MyCustomCategoryProductCard}  categoryTitlePlugin={EmbeddedNumProducts} />
   * ```
   */
  categoryTitlePlugin?: typeof CategoryTitle | typeof EmbeddedNumProducts;
  /**
   * When using multiple CategoryPage components on the same page, you need to set a unique stateKey for each one. We recommend using an incrementing number, such as "1", "2", "3", etc. To associate a certain BreadCrumbs or QuickLinks component with a certain CategoryPage component, set the same stateKey on both.
   */
  stateKey?: string;
  /**
   * See JSDoc of ReactContentBlocksByRow
   */
  contentBlocksByRow?: ReactContentBlocksByRow;
}

/**
 * CategoryPage is a component that renders a Depict category page. Go to definition on the props for more info.
 * @param props the props for the category page.
 *
 * @example
 * ```tsx
 * import { DepictProductCard, ImagePlaceholder, Display, CategoryPage } from '@depict-ai/react-ui'
 *
 * function Category() {
 *  return <CategoryPage listingId="72909a4a-adf7-4355-b7be-f9090d4185db" productCard={MyCustomCategoryProductCard} />
 * }
 *
 * interface MyCustomDisplay extends Display {}
 *
 * export const MyCustomCategoryProductCard: DepictProductCard<MyCustomDisplay> = ({
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
 * ```
 */
export function CategoryPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>(
  props: CategoryPageConfig<
    // Without the tuple notation this doesn't work for some reason
    [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
  >
) {
  return wrap_solid_in_react<typeof props>({
    // @ts-ignore
    solid_component: (...args) => {
      // Work around some kind of babel bug where an optimisation turns ...args into `arguments` in the ES10 build which becomes the wrong arguments when read from teh getter
      const ourArguments = args;
      return <SolidShowComponentAfterStateSet>{SolidCategoryPage(...ourArguments)}</SolidShowComponentAfterStateSet>;
    },
    props: props,
    wrapper_type: "div",
    wrapper_style: {},
  });
}

function SolidCategoryPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>(
  props: CategoryPageConfig<
    // Without the tuple notation this doesn't work for some reason
    [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
  >,
  set_portals: (portals: ReactPortal[]) => void
) {
  const depict_category = createMemo(
    () => get_instance_and_track_component("category", props.stateKey, "CategoryPage") // stateKey can change
  );

  const [category_state_set, set_category_state_set] = createSignal(false);
  const component_portals = new Set<ReactPortal>();
  const [, set_category_page_in_dom] = globalState.category_page_in_dom;

  // We should only get here once react already has a DOM node which means we should be in the DOM
  set_category_page_in_dom(true);
  onCleanup(() => set_category_page_in_dom(false));

  createComputed(() => {
    const { listingQuery } = props;
    // listingQuery is a store, but we want to just set it as a normal object whose reference changes when the store changes
    depict_category().listing_query = { ...listingQuery };
    if (listingQuery?.id && listingQuery?.type) {
      set_category_state_set(true);
      globalState.known_category_paths.add(location.pathname);
    }
  });

  const Category = () =>
    createMemo(() => {
      const stateKey = untrack(() => props.stateKey);
      if (rendered_components_with_state_key.has(stateKey)) {
        throw new Error(
          `You have multiple CategoryPage components with the same stateKey: ${stateKey}. Each CategoryPage component must have a unique stateKey.`
        );
      }
      rendered_components_with_state_key.add(stateKey);
      onCleanup(() => rendered_components_with_state_key.delete(stateKey));
      const transformed_content_blocks = solidify_content_blocks_by_row(
        () => props.contentBlocksByRow,
        component_portals,
        set_portals
      );

      return OrigCategoryPage<OriginalDisplay, OutputDisplay>({
        depict_category: depict_category(),
        get cols_at_size() {
          return props.columnsAtSize ?? defaultColsAtSize;
        },
        get grid_spacing() {
          return props.gridSpacing ?? defaultGridSpacing;
        },
        category_title: untrack(() => props.categoryTitlePlugin) || defaultCategoryTitlePlugin,
        get show_breadcrumbs() {
          return props.showBreadcrumbs;
        },
        get show_quicklinks() {
          return props.showQuicklinks;
        },
        get hideCount0FilterOptions_() {
          return props.hideCount0FilterOptions;
        },
        get content_blocks_by_row() {
          // Having content blocks and a slider at the same time is not supported, so we have to actually forward undefined if none are specified
          if (!props.contentBlocksByRow) return undefined;
          return transformed_content_blocks();
        },
        get layout() {
          return props.layout;
        },
        get switchToFiltersDrawerBreakpoint_() {
          return props.switchToFiltersDrawerBreakpoint;
        },
        product_card_template: (display, info) =>
          render_display_or_block_from_react_template({
            component_props: { display },
            get_react_template: () => props.productCard,
            component_portals,
            set_portals,
            set_on_index_change_: info?.set_on_index_change,
          }),
      });
    }) as unknown as solid_JSX.Element;

  return (
    <SolidShowComponentAfterStateSet isSet={category_state_set}>
      <Category />
    </SolidShowComponentAfterStateSet>
  );
}
