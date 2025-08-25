/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, JSX, Show } from "solid-js";
import { catchify, use_href_accessor } from "@depict-ai/utilishared";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
  TextSuggestionType,
} from "../../../helper_functions/keyboard_navigation_types";
import { HighlightTextInSpan } from "../../HighlightTextInSpan";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import {
  scrollIntoViewIfSelectedByKeyboardNavigation,
  setKeyboardNavigationEntry,
  useIsSelected,
} from "../../../helper_functions/modal_keyboard_navigation_helpers";
import { TextPlaceholder } from "../../../../shared/components/Placeholders/TextPlaceholder";
import { allowNativeNavigation } from "../../../../shared/helper_functions/allowNativeNavigation";

export function TextSuggestion({
  search_query_url_param_name_,
  selected_index_: [read_selected_index_, write_selected_index_],
  url_transformer_,
  currently_showing_suggestions_: [, set_currently_showing_suggestions],
  extraTitleRowElements_,
  title_,
  searching_for_value_,
  submit_query_,
  class_,
  itemIndex_,
  itemsToShow_,
  router_,
  showPlaceholders_,
}: {
  searching_for_value_: Accessor<string | undefined>;
  search_query_url_param_name_: string;
  itemsToShow_: Accessor<TextSuggestionType[] | undefined>;
  itemIndex_: Accessor<number>;
  class_: string;
  url_transformer_?: (url_object: URL) => unknown;
  selected_index_: SelectedIndexType;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  title_: () => JSX.Element;
  extraTitleRowElements_?: () => JSX.Element;
  submit_query_: (new_query?: string) => void;
  router_: PseudoRouter;
  showPlaceholders_: Accessor<boolean>;
}) {
  const currentHref = use_href_accessor();
  setKeyboardNavigationEntry(set_currently_showing_suggestions, itemIndex_, itemsToShow_);

  return (
    <Show when={itemsToShow_()?.length || showPlaceholders_()}>
      <div class={"suggestions " + class_} style={{ order: itemIndex_() }}>
        <div class="title-row">
          <h2>{title_()}</h2>
          {extraTitleRowElements_?.()}
        </div>
        <div class="suggestion-container">
          <Show
            when={!showPlaceholders_()}
            fallback={Array.from({ length: 3 }).map(() => (
              <TextPlaceholder class="suggestion line-clamp" width="min(100%, 25ch)" height="1em" />
            ))}
          >
            <Index each={itemsToShow_()}>
              {(item, index) => {
                const href = createMemo(() => {
                  const itemContents = item();
                  if ("page_url_" in itemContents) {
                    return itemContents.page_url_;
                  }
                  const urlObject = new URL(currentHref());
                  url_transformer_?.(urlObject);
                  urlObject.searchParams.set(search_query_url_param_name_, itemContents.title_);
                  return urlObject.href;
                });
                const [isSelected, selectedDueToKeyboardNavigation] = useIsSelected(
                  read_selected_index_,
                  itemIndex_,
                  () => index
                );
                const wholeTextToDisplay = createMemo(() => item().title_);

                return (
                  <a
                    class="suggestion"
                    classList={{
                      selected: isSelected(),
                    }}
                    aria-selected={isSelected()}
                    onMouseEnter={catchify(() => write_selected_index_([itemIndex_(), index]))}
                    onMouseLeave={catchify(() => write_selected_index_())}
                    href={href()}
                    // So screen reader reads continuously, not chunked by highlighting
                    aria-label={wholeTextToDisplay()}
                    ref={element => {
                      scrollIntoViewIfSelectedByKeyboardNavigation(element, selectedDueToKeyboardNavigation);
                      element.addEventListener(
                        "click",
                        catchify(ev => {
                          // Viskan's Oscar Jacobson site requires us to add the event listener normally here. They do too much when this element is clicked. We work around it by blocking the event and just dispatching it non-bubbling on this element.
                          const itemContents = item();
                          if ("page_url_" in itemContents) {
                            router_.navigate_.go_to_({
                              new_url_: href()!,
                              is_replace_: false,
                              event_: ev,
                            });
                            return;
                          }
                          if (allowNativeNavigation(ev)) return; // not button 0 or cmd/ctrl click
                          ev.preventDefault();
                          submit_query_(itemContents.title_);
                        })
                      );
                    }}
                  >
                    <HighlightTextInSpan
                      class_="title line-clamp"
                      whole_text_to_display_={wholeTextToDisplay}
                      searching_for_value_={searching_for_value_}
                    />
                  </a>
                );
              }}
            </Index>
          </Show>
        </div>
      </div>
    </Show>
  );
}
