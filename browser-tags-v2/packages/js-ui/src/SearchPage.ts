import {
  BaseSearchPageConfig,
  defaultColsAtSize,
  defaultGridSpacing,
  DepictSearch,
  ModernDisplayWithPageUrl,
  SearchPage as OrigSearchPage,
} from "@depict-ai/ui";
import { Display, ModernDisplay, snakeCasifyObject } from "@depict-ai/utilishared";
import { DepictSearchProvider } from "./DepictSearchProvider";
import { internalSearch } from "./internal_state";
import { JSUIContentBlocksByRow, PLPConfig } from "./types";
import { Accessor } from "solid-js";

export interface SearchPageConfig<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>
  extends BaseSearchPageConfig,
    PLPConfig<
      // Without the tuple notation this doesn't work for some reason
      [OutputDisplay] extends [never] ? OriginalDisplay : ModernDisplayWithPageUrl<OutputDisplay>
    > {
  searchProvider: DepictSearchProvider<OriginalDisplay, OutputDisplay>;
  /**
   * Can be used to know when the search query is changed and update other content on the page accordingly. Will be called when the SearchPage is created, every time the query changes and when the SearchPage is destroyed. When newQuery is undefined it means the search page has been closed/left.
   */
  onQueryChange?: (newQuery?: string | undefined, oldQuery?: string | undefined) => void;
  /**
   * Function returning content blocks (JSUIContentBlocksByRow). Use contentBlockStore if you want to be able to manipulate the content blocks later on.
   */
  getContentBlocksByRow?: Accessor<JSUIContentBlocksByRow>;
}

export function SearchPage<OriginalDisplay extends Display, OutputDisplay extends ModernDisplay | never>({
  searchProvider,
  includeInputField,
  gridSpacing,
  columnsAtSize,
  productCard,
  onQueryChange,
  getContentBlocksByRow,
}: SearchPageConfig<OriginalDisplay, OutputDisplay>): HTMLElement {
  // Todo: get rid of wrapper div by making Searchpage just export one element. Comments can go inside that element.
  const div = document.createElement("div");
  div.append(
    ...OrigSearchPage<OriginalDisplay, OutputDisplay>({
      depict_search: internalSearch.get(searchProvider) as DepictSearch<OriginalDisplay, OutputDisplay>,
      include_input_field: includeInputField,
      cols_at_size: columnsAtSize ?? defaultColsAtSize,
      grid_spacing: gridSpacing ?? defaultGridSpacing,
      product_card_template: productCard,
      on_query_change: onQueryChange,
      get content_blocks_by_row() {
        const value = getContentBlocksByRow?.();
        if (!value) return value;
        return value.map(block => block && snakeCasifyObject(block));
      },
    })
  );
  return div;
}
