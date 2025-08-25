import { ListingSuggestion, SearchSuggestionsResponseV3 } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { SearchResponse } from "@depict-ai/types/api/SearchResponse";
import { AddActualFieldToFilters } from "../shared/types";
import { ModernDisplayWithPageUrl } from "../shared/display_transformer_types";

// Extend the backend types to reflect how they look after the DisplayTransformers has been applied
// Kudos to ChatGPT

export type ListingSuggestionAfterURLCreator = {
  [K in keyof ListingSuggestion]: K extends "ancestors"
    ? (ListingSuggestion & { page_url: string })[]
    : ListingSuggestion[K];
} & { page_url: string };

// Helper type to replace BaseCategoryDisplay with ModifiedBaseCategoryDisplay
type ReplaceCategorySuggestion<T> = T extends ListingSuggestion
  ? ListingSuggestionAfterURLCreator
  : T extends ListingSuggestion[]
  ? ListingSuggestionAfterURLCreator[]
  : T;

// Mapped type that extends SearchSuggestionsResponse
export type SearchSuggestionsResponseAfterURLCreator = {
  [K in keyof SearchSuggestionsResponseV3]: ReplaceCategorySuggestion<SearchSuggestionsResponseV3[K]>;
};

// Helper type to add page_url property to the display type
type AddPageUrlToDisplay<T extends any[]> = (T[number] & { page_url: string })[];

// Mapped type that extends SearchResponse
export type SearchResponseAfterDisplayTransformer = {
  [K in keyof SearchResponse]: K extends "displays"
    ? ModernDisplayWithPageUrl<any>[]
    : K extends "filters"
    ? AddActualFieldToFilters<SearchResponse[K]>
    : SearchResponse[K];
};

// Type used to render ContentResults in the ClassicSearchModal, similar to CategorySuggestionAfterURLCreator
export type InternalContentSuggestion = {
  /**
   * The title of the content
   */
  title: string;
  /**
   * The full URL to the content
   */
  page_url: string;
  type: "content";
};
