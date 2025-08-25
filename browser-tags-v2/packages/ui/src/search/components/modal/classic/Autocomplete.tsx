/** @jsxImportSource solid-js */
import { Accessor, createComputed, createMemo, createSignal, on, Resource, Show, Signal, untrack } from "solid-js";
import { deparallelize_no_drop, Display } from "@depict-ai/utilishared";
import { DepictAPI } from "../../../../shared/DepictAPI";
import { QuerySuggestion } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { PreviousSearches } from "./PreviousSearches";
import { LowerQuerySuggestions } from "./LowerQuerySuggestions";
import { autocomplete_keyboard_navigation } from "../../../helper_functions/autocomplete_keyboard_navigation";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../../../helper_functions/keyboard_navigation_types";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import {
  InternalContentSuggestion,
  ListingSuggestionAfterURLCreator,
  SearchResponseAfterDisplayTransformer,
} from "../../../types";
import { instant_goto_content_results_functionality } from "../../../helper_functions/instant_goto_content_results_functionality";

export const string_containing_query = "query";

export function Autocomplete<T extends Display>({
  search_field_value_,
  get_search_query_,
  search_query_url_param_name_,
  previous_searches_: [unfiltered_previous_searches, set_unfiltered_previous_searches_],
  previous_searches_text_,
  depict_api_,
  merchant_,
  market_,
  input_field_,
  url_transformer_,
  currently_showing_suggestions_,
  set_override_on_enter_fn_,
  selected_index_,
  i18n_,
  include_category_suggestions_,
  submit_query_,
  router_,
  get_modal_search_results_,
  content_search_enabled_,
}: {
  search_field_value_: Signal<string>;
  get_search_query_: Accessor<string>;
  previous_searches_: Signal<string[]>;
  search_query_url_param_name_: string;
  previous_searches_text_: Accessor<string>;
  depict_api_: DepictAPI<T>;
  set_override_on_enter_fn_: (new_fn: (e: KeyboardEvent) => boolean) => unknown;
  merchant_: Accessor<string>;
  market_: Accessor<string>;
  input_field_: Accessor<HTMLInputElement | undefined>;
  url_transformer_?: (url_object: URL) => unknown;
  selected_index_: SelectedIndexType;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  i18n_: solid_search_i18n;
  include_category_suggestions_: boolean;
  submit_query_: (new_query?: string) => void;
  router_: PseudoRouter;
  content_search_enabled_: Accessor<boolean>;
  get_modal_search_results_: Accessor<
    undefined | Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
  >;
}) {
  const [searching_for_value, set_searching_for_value] = createSignal<undefined | string>();
  const [show_stale_content_results, set_show_stale_content_results] = createSignal(false);
  const [read_search_field_value] = search_field_value_;
  const updating_blocked = createSignal<boolean>(false);
  const [read_suggestion_signal_, write_suggestion_signal] = createSignal<
    (QuerySuggestion | ListingSuggestionAfterURLCreator)[]
  >([]);
  const previous_searches_without_current_query = createMemo(
    () => [...unfiltered_previous_searches()].reverse().filter(q => q !== get_search_query_())
    // don't want to return the current query
  );
  const previous_searches_matching_query = createMemo(() => {
    return previous_searches_without_current_query()
      .filter(cs_search => {
        const search = cs_search.toLowerCase();
        const value = searching_for_value()?.toLowerCase();
        if (!value) {
          return false;
        }
        return search.includes(value) || value.includes(search);
      })
      .slice(0, 2);
  });
  const deparallelized_fn = deparallelize_no_drop(
    async (request_obj: { merchant: string; market: string; query: string; locale: string }) => {
      const api_response = await depict_api_.suggest(request_obj);

      if (!api_response?.suggestions?.length) {
        write_suggestion_signal([]);
        return;
      }

      const new_value = (api_response.suggestions as (QuerySuggestion | ListingSuggestionAfterURLCreator)[]).sort(
        (
          { type: a_type },
          { type: b_type } // this is probably stupid? But in the UI we show query suggestions first so for the keyboard suggestions to make sense with the index we sort them first here
        ) =>
          (a_type === string_containing_query && b_type === string_containing_query) ||
          (a_type !== string_containing_query && b_type !== string_containing_query)
            ? 0
            : a_type === string_containing_query
            ? -1
            : 1
      );
      write_suggestion_signal(new_value);
      selected_index_[1](undefined); // reset selected index on new results
    }
  );
  const show_previous_searches_component = createMemo(
    () => !read_search_field_value() || (untrack(updating_blocked[0]) && !untrack(searching_for_value))
  );

  const get_content_results_ = createMemo<InternalContentSuggestion[] | undefined>(prev => {
    if (!content_search_enabled_()) {
      return [];
    }
    if (show_stale_content_results()) {
      // don't update content results when query suggestions don't update because otherwise they disappear when trying to keyboard navigate to them
      return prev;
    }
    return get_modal_search_results_()?.()?.content_search_links?.map(
      link =>
        ({
          page_url: link.page_url,
          type: "content",
          title: link.title,
        }) as const
    );
  });

  // Ideally we'd propagate up the suggestion signal too and call this from SearchModal.tsx? Because it's not super related with autocomplete, but it's not a huge feature, and it's easier here so keeping it.
  // It's the functionality to open the content results page when you press enter, in the modal, when there's only one content result
  const manipulated_set_override_on_enter_fn_ = instant_goto_content_results_functionality({
    set_override_on_enter_fn_,
    get_modal_search_results_,
    suggestions_response_: read_suggestion_signal_,
    router_,
    content_results_: get_content_results_,
    has_previous_searches_matching_query_: createMemo(() => previous_searches_matching_query().length > 0),
  });

  createComputed(() => {
    const field_value = read_search_field_value();
    if (untrack(updating_blocked[0])) {
      // not using updating_blocked instead of below signal since I presume they'd start updating too early then
      set_show_stale_content_results(true);
    } else {
      set_searching_for_value(field_value);
      deparallelized_fn({
        merchant: merchant_(),
        market: market_(),
        locale: i18n_.backend_locale_(),
        query: field_value,
      });
      set_show_stale_content_results(false);
    }
  });

  createComputed(
    on(search_field_value_[0], () => !updating_blocked[0]() && selected_index_[1](undefined), { defer: true })
  ); // reset autocomplete position if query changes

  autocomplete_keyboard_navigation({
    element_: input_field_,
    selected_index_: selected_index_,
    search_field_value_,
    updating_blocked_: updating_blocked,
    currently_showing_suggestions_,
    set_override_on_enter_fn_: manipulated_set_override_on_enter_fn_,
    search_query_param_name_: search_query_url_param_name_,
    url_transformer_,
    router_,
  });

  return (
    <>
      <Show when={show_previous_searches_component()}>
        <PreviousSearches
          i18n_={i18n_}
          set_unfiltered_previous_searches_={set_unfiltered_previous_searches_}
          search_query_param_name_={search_query_url_param_name_}
          text_={previous_searches_text_}
          previous_searches_={createMemo(() => previous_searches_without_current_query().slice(0, 3))}
          selected_index_={selected_index_}
          currently_showing_suggestions_={currently_showing_suggestions_}
          url_transformer_={url_transformer_}
          submit_query_={submit_query_}
        />
      </Show>
      <LowerQuerySuggestions
        filtered_previous_searches_={previous_searches_matching_query}
        on_previous_searches_page_={show_previous_searches_component}
        i18n_={i18n_}
        get_content_results_={get_content_results_}
        url_transformer_={url_transformer_}
        searching_for_value_={searching_for_value}
        search_query_url_param_name_={search_query_url_param_name_}
        selected_index_={selected_index_}
        suggestion_memo_={read_suggestion_signal_}
        currently_showing_suggestions_={currently_showing_suggestions_}
        include_category_suggestions_={include_category_suggestions_}
        router_={router_}
        submit_query_={submit_query_}
      />
    </>
  );
}
