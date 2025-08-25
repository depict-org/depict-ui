/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, Show } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { QuerySuggestion } from "@depict-ai/types/api/SearchSuggestionsResponseV3";
import { link_to_param_change } from "../../../helper_functions/link_to_param_change";
import { string_containing_query } from "./Autocomplete";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../../../helper_functions/keyboard_navigation_types";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { HighlightTextInSpan } from "../../HighlightTextInSpan";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import { SearchIcon } from "../../../../shared/components/icons/SearchIcon";
import { PreviousSearchIcon } from "../../../../shared/components/icons/PreviousSearchIcon";
import { InternalContentSuggestion, ListingSuggestionAfterURLCreator } from "../../../types";
import { FileTextIcon } from "../../../../shared/components/icons/FileTextIcon";
import { setKeyboardNavigationEntry, useIsSelected } from "../../../helper_functions/modal_keyboard_navigation_helpers";
import { allowNativeNavigation } from "../../../../shared/helper_functions/allowNativeNavigation";

export function LowerQuerySuggestions({
  suggestion_memo_,
  search_query_url_param_name_,
  selected_index_: [read_selected_index_, write_selected_index_],
  url_transformer_,
  filtered_previous_searches_,
  currently_showing_suggestions_: [, set_currently_showing_suggestions_],
  on_previous_searches_page_,
  i18n_,
  include_category_suggestions_,
  searching_for_value_,
  router_,
  submit_query_,
  get_content_results_,
}: {
  searching_for_value_: Accessor<string | undefined>;
  suggestion_memo_: Accessor<(QuerySuggestion | ListingSuggestionAfterURLCreator)[]>;
  search_query_url_param_name_: string;
  filtered_previous_searches_: Accessor<string[]>;
  url_transformer_?: (url_object: URL) => unknown;
  selected_index_: SelectedIndexType;
  on_previous_searches_page_: Accessor<boolean>;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  i18n_: solid_search_i18n;
  include_category_suggestions_: boolean;
  router_: PseudoRouter;
  submit_query_: (new_query?: string) => void;
  get_content_results_: Accessor<InternalContentSuggestion[] | undefined>;
}) {
  const queries_memo = createMemo(
    () =>
      suggestion_memo_()
        .filter(
          suggestion =>
            suggestion.type === string_containing_query && !filtered_previous_searches_().includes(suggestion.query) // don't show the ones we already show from the history
        )
        // + limit to three query suggestions, API sends more sometimes
        .slice(0, 3) as QuerySuggestion[]
  );
  const not_queries_memo = createMemo(() => {
    // For the section that shows categories and content results
    // We want to limit to 3 items, and we want to show the categories first
    const content_results = get_content_results_() || [];
    const from_suggest_request = include_category_suggestions_
      ? suggestion_memo_().filter(({ type }) => type !== string_containing_query)
      : [];

    return [...from_suggest_request.slice(0, content_results.length ? 2 : 3), ...content_results.slice(0, 1)] as (
      | ListingSuggestionAfterURLCreator
      | InternalContentSuggestion
    )[];
  });
  const render_entry = (
    input_obj: Accessor<QuerySuggestion | ListingSuggestionAfterURLCreator | InternalContentSuggestion>,
    autocomplete_data_index: number,
    index: number,
    is_history = false
  ) => {
    const is_query = createMemo(() => input_obj().type === string_containing_query);
    const href_with_changed_params_accessor = createMemo(() =>
      is_query()
        ? link_to_param_change({
            param_: search_query_url_param_name_,
            value_: createMemo(() => (input_obj() as QuerySuggestion).query),
            url_transformer_,
          })
        : undefined
    );
    const href = createMemo(() =>
      is_query()
        ? href_with_changed_params_accessor()!()
        : (input_obj() as ListingSuggestionAfterURLCreator | InternalContentSuggestion).page_url
    );
    const [is_selected] = useIsSelected(
      read_selected_index_,
      () => autocomplete_data_index,
      () => index
    );
    const parent_title_if_exists = createMemo(() => {
      const item = input_obj();
      if (!("ancestors" in item)) return;
      return item.ancestors.at(-1)?.title;
    });

    return (
      <a
        class="suggestion"
        classList={{
          selected: is_selected(),
          history: is_history,
          ["type-" + input_obj().type]: true,
        }}
        onMouseEnter={catchify(() => write_selected_index_([autocomplete_data_index, index]))}
        onMouseLeave={catchify(() => write_selected_index_(undefined))}
        href={href()}
        ref={element =>
          element.addEventListener(
            "click",
            catchify(ev => {
              // Viskan's Oscar Jacobson site requires us to add the event listener normally here. They do too much when this element is clicked. We work around it by blocking the event and just dispatching it non-bubbling on this element.
              if (is_query()) {
                if (allowNativeNavigation(ev)) {
                  // not button 0 or cmd/ctrl click
                  return;
                }
                const input = input_obj();
                ev.preventDefault();
                submit_query_(
                  is_query() ? (input as QuerySuggestion).query : (input as ListingSuggestionAfterURLCreator).title
                );
                return;
              }
              router_.navigate_.go_to_({
                new_url_: href(),
                is_replace_: false,
                event_: ev,
              });
            })
          )
        }
      >
        {is_query() ? (
          <>
            <Show
              when={is_history}
              fallback={
                <div class="search-icon">
                  <SearchIcon />
                </div>
              }
            >
              <PreviousSearchIcon />
            </Show>
            <HighlightTextInSpan
              class_="value line-clamp"
              whole_text_to_display_={createMemo(() => (input_obj() as QuerySuggestion).query)}
              searching_for_value_={searching_for_value_}
            />
          </>
        ) : (
          <>
            {parent_title_if_exists() ? (
              <div class="with-parent-title">
                <HighlightTextInSpan
                  class_="category line-clamp"
                  whole_text_to_display_={createMemo(() => (input_obj() as ListingSuggestionAfterURLCreator).title)}
                  searching_for_value_={searching_for_value_}
                />
                <span class="value line-clamp">{parent_title_if_exists()}</span>
              </div>
            ) : input_obj().type === "content" ? (
              <div class="with-icon">
                <FileTextIcon width="16" height="16" />
                <HighlightTextInSpan
                  class_="content line-clamp"
                  whole_text_to_display_={createMemo(() => (input_obj() as ListingSuggestionAfterURLCreator).title)}
                  searching_for_value_={searching_for_value_}
                />
              </div>
            ) : (
              <HighlightTextInSpan
                class_="category line-clamp"
                whole_text_to_display_={createMemo(() => (input_obj() as ListingSuggestionAfterURLCreator).title)}
                searching_for_value_={searching_for_value_}
              />
            )}
            <span class="type">
              {createMemo(() => {
                if (input_obj().type === "content") {
                  return i18n_.content_();
                }

                if ((input_obj() as ListingSuggestionAfterURLCreator).listing_type === "brand") {
                  return i18n_.brand_();
                }

                return i18n_.category_();
              })()}
            </span>
          </>
        )}
      </a>
    );
  };
  const should_show_previous_searches_in_query_part = createMemo(() => !on_previous_searches_page_());
  const should_show_at_all = createMemo(
    () =>
      suggestion_memo_()?.length ||
      (should_show_previous_searches_in_query_part() && filtered_previous_searches_().length) ||
      get_content_results_()?.length
  );
  const should_show_query_part = createMemo(() => queries_memo().length || filtered_previous_searches_().length);

  return (
    <Show when={should_show_at_all()}>
      <div class="suggestions" classList={{ compact: on_previous_searches_page_() }}>
        <Show when={on_previous_searches_page_()}>
          <h2 class="text">{i18n_.suggestions_()}</h2>
        </Show>
        <Show when={should_show_query_part()}>
          <div class="suggestion-container query">
            <Show when={should_show_previous_searches_in_query_part()} keyed={false}>
              {(() => {
                const mapped_history_results = createMemo(() =>
                  filtered_previous_searches_().map(result => ({
                    type: string_containing_query as typeof string_containing_query,
                    query: result,
                    suggestions_result_id: "history", // worthless to fix typing
                  }))
                );
                const index_in_autocomplete = 1;
                setKeyboardNavigationEntry(
                  set_currently_showing_suggestions_,
                  () => index_in_autocomplete,
                  createMemo(() => mapped_history_results().map(item => ({ title_: item.query })))
                );

                return (
                  <Index each={mapped_history_results()}>
                    {(item, index) =>
                      render_entry(
                        item as unknown as Accessor<QuerySuggestion & ListingSuggestionAfterURLCreator>,
                        index_in_autocomplete,
                        index,
                        true
                      )
                    }
                  </Index>
                );
              })()}
            </Show>

            {(() => {
              const index_in_autocomplete = 2;
              setKeyboardNavigationEntry(
                set_currently_showing_suggestions_,
                () => index_in_autocomplete,
                createMemo(() => queries_memo().map(item => ({ title_: item.query })))
              );

              return (
                <Index each={queries_memo()}>{(item, index) => render_entry(item, index_in_autocomplete, index)}</Index>
              );
            })()}
          </div>
        </Show>
        <Show when={not_queries_memo().length} keyed={false}>
          <div class="suggestion-container page">
            {(() => {
              const index_in_autocomplete = 3;
              setKeyboardNavigationEntry(
                set_currently_showing_suggestions_,
                () => index_in_autocomplete,
                createMemo(() => not_queries_memo().map(item => ({ title_: item.title, page_url_: item.page_url })))
              );
              return (
                <Index each={not_queries_memo()}>
                  {(item, index) => render_entry(item, index_in_autocomplete, index)}
                </Index>
              );
            })()}
          </div>
        </Show>
      </div>
    </Show>
  );
}
