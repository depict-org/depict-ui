import { Accessor, createComputed, createSignal, Resource } from "solid-js";
import {
  InternalContentSuggestion,
  ListingSuggestionAfterURLCreator,
  SearchResponseAfterDisplayTransformer,
} from "../types";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { QuerySuggestion } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { open_link_new_tab_on_cmd_pressed } from "./open_link_new_tab_on_cmd_pressed";

export function instant_goto_content_results_functionality({
  set_override_on_enter_fn_,
  get_modal_search_results_,
  suggestions_response_,
  router_,
  content_results_,
  has_previous_searches_matching_query_,
}: {
  content_results_: Accessor<
    ((InternalContentSuggestion & { page_url_?: never }) | { page_url_: string; page_url?: never })[] | undefined
  >;
  set_override_on_enter_fn_: (new_fn: (e: KeyboardEvent) => boolean) => unknown;
  get_modal_search_results_: Accessor<
    undefined | Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
  >;
  suggestions_response_:
    | Resource<(QuerySuggestion | ListingSuggestionAfterURLCreator)[] | undefined>
    | (Accessor<(QuerySuggestion | ListingSuggestionAfterURLCreator)[]> & { loading?: boolean }); // For compat with ClassicSearchModal
  router_: PseudoRouter;
  has_previous_searches_matching_query_: Accessor<boolean>;
}) {
  const [get_autocomplete_wants_override_function, set_autocomplete_wants_override_function] = createSignal<
    (e: KeyboardEvent) => boolean
  >(() => false);

  createComputed(() => {
    const suggestions = suggestions_response_();
    const search_results = get_modal_search_results_()?.();
    const content_results = content_results_();

    // If we only have one content result and nothing else, go there when pressing enter
    if (
      !suggestions?.length &&
      !suggestions_response_.loading &&
      !search_results?.displays?.length &&
      content_results?.length === 1 &&
      !has_previous_searches_matching_query_()
    ) {
      const [onlyResult] = content_results;
      const page_url = (onlyResult.page_url_ || onlyResult.page_url)!;
      set_override_on_enter_fn_(e => {
        if (!open_link_new_tab_on_cmd_pressed(e, page_url)) {
          // Above fn will return true if it opened a new tab, and we won't make these checks anymore
          router_.navigate_.go_to_({ new_url_: page_url, is_replace_: false });
        }
        return true;
      });
      return;
    }

    set_override_on_enter_fn_(get_autocomplete_wants_override_function());
  });

  return (new_fn: (e: KeyboardEvent) => boolean) => set_autocomplete_wants_override_function(() => new_fn);
}
