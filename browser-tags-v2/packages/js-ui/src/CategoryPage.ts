import {
  BaseCategoryPageConfig,
  CategoryPage as OrigCategoryPage,
  CategoryTitle,
  defaultColsAtSize,
  defaultGridSpacing,
  embedded_num_products,
  ListingQuery,
  ModernDisplayWithPageUrl,
} from "@depict-ai/ui";
import { Display, ModernDisplay, snakeCasifyObject } from "@depict-ai/utilishared";
import { internalCategory } from "./internal_state";
import { JSUIContentBlocksByRow, PLPConfig } from "./types";
import { DepictCategoryProvider } from "./DepictCategoryProvider";
import { Accessor } from "solid-js";

export interface CategoryPageConfig<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>
  extends BaseCategoryPageConfig,
    PLPConfig<
      // Without the tuple notation this doesn't work for some reason
      [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
    > {
  categoryProvider: DepictCategoryProvider<OriginalDisplay, OutputDisplay>;
  /**
   * categoryTitlePlugin is an optional plugin that can be used to customize the title of the category page.
   * The default is `CategoryTitle` which shows the title of the category and the number of products within.
   * EmbeddedNumProducts on the other hand only displays the number of products within a category and tries to fit this between the sort and filter button on mobile, if the text length of the localisation permits.
   * @default CategoryTitle
   *
   * @example
   * ```tsx
   * <CategoryPage listingId="72909a4a-adf7-4355-b7be-f9090d4185db" productCard={MyCustomCategoryProductCard} categoryTitlePlugin={EmbeddedNumProducts} />
   * ```
   */
  categoryTitlePlugin?: typeof CategoryTitle | typeof embedded_num_products;
  /**
   * Can be used to know when the CategoryPage is navigated to a new category and update other content on the page accordingly.
   * When newListingId is undefined it means the category page has been closed/left, or you have provided undefined as the listingId prop to the provider.
   */
  onListingQueryChange?: (newListingId?: ListingQuery | undefined, oldListingId?: ListingQuery | undefined) => void;
  /**
   * Function returning content blocks (JSUIContentBlocksByRow). Use contentBlockStore if you want to be able to manipulate the content blocks later on.
   */
  getContentBlocksByRow?: Accessor<JSUIContentBlocksByRow>;
}

export function CategoryPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>({
  gridSpacing,
  columnsAtSize,
  productCard,
  categoryProvider,
  showBreadcrumbs,
  showQuicklinks,
  categoryTitlePlugin,
  onListingQueryChange,
  getContentBlocksByRow,
  layout,
}: CategoryPageConfig<OriginalDisplay, OutputDisplay>): HTMLElement {
  // Todo: get rid of wrapper div by making CategoryPage just export one element. Comments can go inside that element.
  const div = document.createElement("div");
  div.append(
    ...OrigCategoryPage<OriginalDisplay, OutputDisplay>({
      depict_category: internalCategory.get(categoryProvider)!,
      show_breadcrumbs: showBreadcrumbs,
      show_quicklinks: showQuicklinks,
      cols_at_size: columnsAtSize ?? defaultColsAtSize,
      grid_spacing: gridSpacing ?? defaultGridSpacing,
      category_title: categoryTitlePlugin || CategoryTitle,
      product_card_template: productCard,
      layout,
      on_listing_query_change: onListingQueryChange,
      get content_blocks_by_row() {
        const value = getContentBlocksByRow?.();
        if (!value) return value;
        return value.map(block => block && snakeCasifyObject(block));
      },
    })
  );
  return div;
}
