/** @jsxImportSource solid-js */
import { Accessor, createComputed, createMemo, createResource, on, Resource, Signal } from "solid-js";
import { QuerySuggestion } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
  TextSuggestionType,
} from "../../../helper_functions/keyboard_navigation_types";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import { ListingSuggestionAfterURLCreator, SearchResponseAfterDisplayTransformer } from "../../../types";
import { TextSuggestion } from "./TextSuggestion";
import { catchify } from "@depict-ai/utilishared";
import { useItemOrder } from "./useItemOrder";
import { DepictAPI } from "../../../../shared/DepictAPI";

const MAX_PREVIOUS = 3;

/**
 * Shows the part in the SearchModal that contains the text suggestions (previous searches, query suggestions, content results)
 */
export function TextSuggestions({
  search_field_value_,
  search_query_url_param_name_,
  previous_searches_: [, set_unfiltered_previous_searches_],
  url_transformer_,
  currently_showing_suggestions_,
  selected_index_,
  i18n_,
  submit_query_,
  router_,
  suggestions_response_,
  suggestions_updating_blocked_,
  searching_for_value_,
  contentResultsToShow_,
  previous_searches_matching_query_,
  itemIndexes_,
  noResults_,
  depict_api_,
  merchant_,
  market_,
  get_modal_search_results_,
}: {
  search_field_value_: Signal<string>;
  previous_searches_: Signal<string[]>;
  search_query_url_param_name_: string;
  url_transformer_?: (url_object: URL) => unknown;
  selected_index_: SelectedIndexType;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  i18n_: solid_search_i18n;
  submit_query_: (new_query?: string) => void;
  router_: PseudoRouter;
  suggestions_response_: Resource<(QuerySuggestion | ListingSuggestionAfterURLCreator)[] | undefined>;
  suggestions_updating_blocked_: Signal<boolean>;
  searching_for_value_: Accessor<string | undefined>;
  contentResultsToShow_: Accessor<TextSuggestionType[]>;
  previous_searches_matching_query_: Accessor<string[]>;
  itemIndexes_: ReturnType<typeof useItemOrder>;
  noResults_: Accessor<boolean>;
  depict_api_: DepictAPI<any>;
  merchant_: Accessor<string>;
  market_: Accessor<string>;
  get_modal_search_results_: () =>
    | Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
    | undefined;
}) {
  const [suggestions_updating_blocked] = suggestions_updating_blocked_;
  const [, set_selected_index] = selected_index_;

  const previousSuggestionsToShow = createMemo(() =>
    previous_searches_matching_query_()
      .map(result => ({
        title_: result,
      }))
      .slice(0, MAX_PREVIOUS)
  );
  const requestPopularSuggestions = createMemo<boolean>(prev => prev || noResults_());
  // When no results, request popular suggestions and show those
  const [noResultsPopularSuggestions] = createResource(
    () =>
      requestPopularSuggestions() && {
        merchant: merchant_(),
        market: market_(),
        locale: i18n_.backend_locale_(),
        query: "",
      },
    async requestObject => {
      const api_response = await depict_api_.suggest(requestObject);
      return api_response?.suggestions as undefined | (QuerySuggestion | ListingSuggestionAfterURLCreator)[];
    }
  );
  const filterOutQuerySuggestions = (
    suggestions: (QuerySuggestion | ListingSuggestionAfterURLCreator)[] | undefined
  ) => {
    const prevMatchingQuery = previous_searches_matching_query_();
    return (
      suggestions
        ?.filter(
          suggestion =>
            suggestion.type === "query" && !prevMatchingQuery.slice(0, MAX_PREVIOUS).includes(suggestion.query) // don't show the ones we already show from the history
        )
        // + limit to three query suggestions, API sends more sometimes
        .slice(0, 3)
        .map(suggestion => ({
          title_: (suggestion as QuerySuggestion).query,
        }))
    );
  };
  // When no results, show popular suggestions
  const querySuggestionsToShow = createMemo<{ title_: string }[] | undefined>(prev => {
    const forQuery = filterOutQuerySuggestions(suggestions_response_());
    const forEmptyQuery = filterOutQuerySuggestions(noResultsPopularSuggestions());
    if (noResults_()) {
      return forEmptyQuery;
    }
    if (!forQuery?.length && (suggestions_response_.loading || get_modal_search_results_()?.loading)) {
      // Ensure we always show something while typing and loading
      return prev;
    }
    return forQuery;
  });
  const sharedSuggestionProps = {
    searching_for_value_,
    search_query_url_param_name_,
    selected_index_: selected_index_,
    currently_showing_suggestions_,
    submit_query_,
    url_transformer_,
    router_,
  } as const;

  const showPlaceholders = createMemo(() => !suggestions_response_.latest); // Only show placeholders on initial modal opening;

  createComputed(
    on(search_field_value_[0], () => !suggestions_updating_blocked() && set_selected_index(undefined), {
      defer: true,
    })
  ); // reset autocomplete position if query changes

  return (
    <>
      <TextSuggestion
        {...sharedSuggestionProps}
        title_={i18n_.popular_}
        class_="query-suggestions"
        itemsToShow_={querySuggestionsToShow}
        itemIndex_={itemIndexes_.suggestionsIndex_}
        showPlaceholders_={() => showPlaceholders() || (noResults_() && !noResultsPopularSuggestions.latest)}
      />
      <TextSuggestion
        {...sharedSuggestionProps}
        title_={i18n_.previous_}
        class_="previous-searches"
        itemsToShow_={previousSuggestionsToShow}
        itemIndex_={itemIndexes_.previousSearchesIndex_}
        extraTitleRowElements_={() => (
          <button class="delete" type="button" onClick={catchify(() => set_unfiltered_previous_searches_([]))}>
            {i18n_.clear_all_from_filter_crumbs_()}
          </button>
        )}
        // We always have data for the previous searches
        showPlaceholders_={() => false}
      />
      <TextSuggestion
        {...sharedSuggestionProps}
        title_={i18n_.content_}
        class_="content-suggestions"
        itemsToShow_={contentResultsToShow_}
        itemIndex_={itemIndexes_.contentResultsIndex_}
        showPlaceholders_={showPlaceholders}
      />
    </>
  );
}
