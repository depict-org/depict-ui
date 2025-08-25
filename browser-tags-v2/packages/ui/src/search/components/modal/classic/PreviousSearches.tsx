/** @jsxImportSource solid-js */
import { Accessor, createMemo, Index, Setter, Show } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { link_to_param_change } from "../../../helper_functions/link_to_param_change";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../../../helper_functions/keyboard_navigation_types";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { PreviousSearchIcon } from "../../../../shared/components/icons/PreviousSearchIcon";
import { CrossIcon } from "../../../../shared/components/icons/CrossIcon";
import { setKeyboardNavigationEntry } from "../../../helper_functions/modal_keyboard_navigation_helpers";
import { allowNativeNavigation } from "../../../../shared/helper_functions/allowNativeNavigation";

export function PreviousSearches({
  text_,
  previous_searches_,
  search_query_param_name_,
  currently_showing_suggestions_: [, set_currently_showing_suggestions_],
  set_unfiltered_previous_searches_,
  selected_index_: [read_selected_index_, write_selected_index_],
  url_transformer_,
  i18n_,
  submit_query_,
}: {
  text_: Accessor<string>;
  set_unfiltered_previous_searches_: Setter<string[]>;
  previous_searches_: Accessor<string[]>;
  search_query_param_name_: string;
  selected_index_: SelectedIndexType;
  currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
  url_transformer_?: (url_object: URL) => unknown;
  i18n_: solid_search_i18n;
  submit_query_: (new_query?: string) => void;
}) {
  const has_entries = createMemo(() => previous_searches_().length >= 1);

  setKeyboardNavigationEntry(
    set_currently_showing_suggestions_,
    () => 0,
    createMemo(() => previous_searches_().map(item => ({ title_: item })))
  );

  return (
    <Show when={has_entries()}>
      <div class="previous-searches">
        <h2 class="text">{text_()}</h2>
        <div class="list">
          <Index each={previous_searches_()}>
            {(item, index) => {
              const href = link_to_param_change({
                param_: search_query_param_name_,
                value_: item,
                url_transformer_: url_transformer_,
              });

              return (
                <a
                  class={`item`}
                  classList={{
                    selected: createMemo(
                      () => read_selected_index_()?.[0] === 0 && read_selected_index_()?.[1] === index
                    )(),
                  }}
                  onMouseEnter={catchify(() => write_selected_index_([0, index]))}
                  onMouseLeave={catchify(() => write_selected_index_())}
                  href={href()}
                  ref={element =>
                    element.addEventListener(
                      // Viskan's Oscar Jacobson site requires us to add the event listener normally here. They do too much when this element is clicked. We work around it by blocking the event and just dispatching it non-bubbling on this element.
                      "click",
                      catchify((ev: MouseEvent) => {
                        if (allowNativeNavigation(ev)) {
                          // not button 0 or cmd/ctrl click
                          return;
                        }
                        ev.preventDefault();
                        submit_query_(item());
                      })
                    )
                  }
                >
                  <div class="left">
                    <PreviousSearchIcon />
                    <span class="line-clamp" title={item()}>
                      {item()}
                    </span>
                  </div>
                  <button
                    class="delete"
                    title={i18n_.previous_searches_delete_entry_from_history_()}
                    ref={element =>
                      element.addEventListener(
                        "click",
                        catchify((e: MouseEvent) => {
                          // Viskan's Oscar Jacobson site requires us to add the event listener normally here. They do too much when this element is clicked. We work around it by blocking the event and just dispatching it non-bubbling on this element.
                          set_unfiltered_previous_searches_(prev => {
                            const new_value = [...prev];
                            const index = new_value.indexOf(item());
                            if (index < 0) {
                              // should never happen but what do I know
                              return prev;
                            }
                            new_value.splice(index, 1);
                            return new_value;
                          });
                          e.stopPropagation();
                          e.preventDefault();
                        })
                      )
                    }
                  >
                    <CrossIcon />
                  </button>
                </a>
              );
            }}
          </Index>
        </div>
      </div>
    </Show>
  );
}
