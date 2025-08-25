import {
  CanBePromiseWrapped,
  DisplayTransformerAlwaysThereData,
  ListingSuggestionForTransformer,
  ProductListingWithAncestors,
} from "../display_transformer_types";
import { ModernDisplay } from "@depict-ai/utilishared";
import { ProductListing } from "@depict-ai/types/api/GetListingResponse";
import { ContentLink } from "@depict-ai/types/api/SearchResponse";

// Value first so shopify merchants can set (extra) display transformers in the shopify app
// Calling these functions normally doesn't do anything, but our shopify app respects them
// Them being here is value first too because this can be easily imported in the product card editor

let extraDisplayTransformers: undefined | ExtraDisplayTransformers<any, any>;

export const getExtraDisplayTransformers = () => extraDisplayTransformers;

/**
 * When called from inside the shopify apps product card editor, this registers extra display transformers to be ran alongside Depict's default added ones. The ones for products and content will run after Depicts but the ones for categories will run before Depicts.
 * @param displayTransformers
 */
export const setExtraDisplayTransformers = <
  InputDisplay extends ModernDisplay,
  OutputDisplay extends ModernDisplay = InputDisplay,
>(
  displayTransformers: ExtraDisplayTransformers<InputDisplay, OutputDisplay>
) => (extraDisplayTransformers = displayTransformers);

// These display transformers are "extra" so they don't have to return a page_url, we already do that in the shopify app
type ExtraDisplayTransformers<InputDisplay extends ModernDisplay, OutputDisplay extends ModernDisplay | never> = {
  products?: (
    options: DisplayTransformerAlwaysThereData & {
      displays: InputDisplay[];
      /**
       * If the category display transformer was called due to navigating to a listing using a <CategoryPage> component, currentListing will be set and contain a promise that can be used to get information of said listing.
       */
      currentListing?: Promise<ProductListing>;
    }
  ) => CanBePromiseWrapped<OutputDisplay[]>;
  categories?: <T extends ProductListingWithAncestors | ListingSuggestionForTransformer>(
    options: DisplayTransformerAlwaysThereData & {
      data: T[];
    }
  ) => CanBePromiseWrapped<T[]>;
  contentResults?: (
    options: DisplayTransformerAlwaysThereData & { data: ContentLink[] }
  ) => CanBePromiseWrapped<ContentLink[]>;
};
