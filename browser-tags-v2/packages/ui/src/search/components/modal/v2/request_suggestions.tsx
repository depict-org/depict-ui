import { DepictAPI } from "../../../../shared/DepictAPI";
import { SelectedIndexType } from "../../../helper_functions/keyboard_navigation_types";
import { Accessor, createComputed, createSignal, Setter, untrack } from "solid-js";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { QuerySuggestion } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { ListingSuggestionAfterURLCreator } from "../../../types";
import { createDeparallelizedNoDropResource } from "../../../../shared/helper_functions/createDeparallelizedNoDropResource";

/**
 * Makes the API call to request suggestions and returns the signal with the suggestions, along with some other logic
 */
export function request_suggestions({
  depict_api_,
  selected_index_: [, set_selected_index],
  search_field_value_,
  suggestions_updating_blocked_,
  merchant_,
  market_,
  i18n_,
  set_show_stale_content_results_,
  set_searching_for_value_,
}: {
  depict_api_: DepictAPI<any>;
  selected_index_: SelectedIndexType;
  search_field_value_: Accessor<string>;
  suggestions_updating_blocked_: Accessor<boolean>;
  merchant_: Accessor<string>;
  market_: Accessor<string>;
  i18n_: solid_search_i18n;
  set_searching_for_value_: Setter<string | undefined>;
  set_show_stale_content_results_: Setter<boolean>;
}) {
  const [requestObject, setRequestObject] = createSignal<{
    merchant: string;
    market: string;
    locale: string;
    query: string;
  }>();

  const suggestionsResource = createDeparallelizedNoDropResource(
    requestObject,
    async (request_obj: { merchant: string; market: string; query: string; locale: string }) => {
      const api_response = await depict_api_.suggest(request_obj);
      return api_response?.suggestions as undefined | (QuerySuggestion | ListingSuggestionAfterURLCreator)[];
    }
  );

  createComputed(() => {
    const field_value = search_field_value_();
    if (untrack(suggestions_updating_blocked_)) {
      // not using updating_blocked instead of below signal since I presume they'd start updating too early then
      set_show_stale_content_results_(true);
    } else {
      set_searching_for_value_(field_value);
      setRequestObject({
        merchant: merchant_(),
        market: market_(),
        locale: i18n_.backend_locale_(),
        query: field_value,
      });
      set_show_stale_content_results_(false);
    }
  });

  createComputed(() => {
    if (suggestionsResource()) {
      set_selected_index(undefined); // reset selected index on new results
    }
  });

  return suggestionsResource;
}
