import { Display, ModernDisplay } from "@depict-ai/utilishared";
import { ContentLink } from "@depict-ai/types/api/SearchResponse";
import { Ancestors, ListingSuggestion } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { ProductListing } from "@depict-ai/types/api/GetListingResponse";

export type DisplayTransformerAlwaysThereData = { merchant: string; market: string; locale: string };

export type CanBePromiseWrapped<T> = T | Promise<T>;

export type ModernDisplayWithPageUrl<T extends ModernDisplay> = {
  [K in keyof T]: K extends "variant_displays" ? (T[K][number] & { page_url: string })[] : T[K];
};

/**
 * A ProductListing with ancestors added in, this is what we pass to the display transformers as the ancestors might be required to construct the URL
 */
export type ProductListingWithAncestors = ProductListing & { ancestors: Ancestors };

/**
 * The displayTransformer for categories does not only get a list of ListingSuggestions, when a search query has listing suggestions, but also their ancestors since we show breadcrumbs for the listing suggestions. To let the user differentiate (since the suggestion ones can be added/removed but not the ancestors) we add a boolean is_suggestion to the listing suggestions passed to the displayTransformer.
 */
export type ListingSuggestionForTransformer =
  | (ListingSuggestion & { is_suggestion: true })
  | (Omit<ListingSuggestion, "suggestions_result_id"> & { is_suggestion: false });

/**
 * DisplayTransformers supersede pageURLCreator
 * DisplayTransformers are functions that take in a list of categories, content search results or products and then can transform or enrich the data for each category, content search result or product card in a batched way.
 */
export type DisplayTransformers<InputDisplay extends ModernDisplay, OutputDisplay extends ModernDisplay | never> = {
  products?: (
    options: DisplayTransformerAlwaysThereData & {
      displays: InputDisplay[];
      /**
       * If the category display transformer was called due to navigating to a listing using a <CategoryPage> component, currentListing will be set and contain a promise that can be used to get information of said listing.
       */
      currentListing?: Promise<ProductListing>;
    }
  ) => CanBePromiseWrapped<OutputDisplay extends ModernDisplay ? ModernDisplayWithPageUrl<OutputDisplay>[] : never>;
  categories?: <T extends ProductListingWithAncestors | ListingSuggestionForTransformer>(
    options: DisplayTransformerAlwaysThereData & {
      data: T[];
    }
  ) => CanBePromiseWrapped<(T & { page_url: string })[]>;
  contentResults?: (
    options: DisplayTransformerAlwaysThereData & { data: ContentLink[] }
  ) => CanBePromiseWrapped<ContentLink[]>;
};

export type SomethingTakingADisplayTransformers<
  InputDisplay extends Display,
  OutputDisplay extends ModernDisplay | never,
> = InputDisplay extends ModernDisplay // kudos to chatGPT for typing help
  ? "page_url" extends keyof InputDisplay["variant_displays"][number]
    ? { display_transformers: DisplayTransformers<InputDisplay, OutputDisplay> } // on modern displays, page_url_creator/display transformers can be specified if page_url exists, for staging sites
    : { display_transformers: DisplayTransformers<InputDisplay, OutputDisplay> } // on modern displays, page_url_creator must be specified if page_url doesn't exist
  : { page_url_creator?: never; display_transformers?: never }; // on old displays, no page_url_creator or display transformers can be specified;
