/** @jsxImportSource solid-js */
import { catchify, Display, ModernDisplay } from "@depict-ai/utilishared";
import {
  Accessor,
  createComputed,
  createMemo,
  createResource,
  createSignal,
  JSX,
  onCleanup,
  Resource,
  Setter,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { DepictAPI } from "../../shared/DepictAPI";
import { solid_search_i18n } from "../../locales/i18n_types";
import { DefaultInstantCard } from "./DefaultInstantCard";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { SearchResponseAfterDisplayTransformer } from "../types";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../helper_functions/keyboard_navigation_types";
import { setKeyboardNavigationEntry } from "../helper_functions/modal_keyboard_navigation_helpers";
import { DefaultInstantCardPlaceholder } from "./DefaultInstantCardPlaceholder";
import { key_displays, render_displays } from "../../shared/helper_functions/card_rendering/render_displays";

export function InstantResults<InputDisplay extends Display, OutputDisplay extends ModernDisplay | never>({
  depict_api_,
  search_field_value_: [get_search_field_value],
  merchant_,
  market_,
  min_products_to_fetch_,
  has_sort_or_filters_,
  i18n_,
  router_,
  set_modal_search_results_,
  InstantCardImageComponent_,
  itemIndex_,
  selected_index_,
  currently_showing_suggestions_,
}: {
  search_field_value_: Signal<string>;
  depict_api_: DepictAPI<InputDisplay, OutputDisplay>;
  merchant_: Accessor<string>;
  market_: Accessor<string>;
  min_products_to_fetch_: number;
  has_sort_or_filters_: Accessor<boolean>;
  i18n_: solid_search_i18n;
  router_: PseudoRouter;
  // Image component to use. Passed down so that old modal can use old ContainedImage that supports browsers that don't support webp but otherwise is bloated while new one uses modern component
  InstantCardImageComponent_: (props: { src_: string; class_?: string }) => JSX.Element;
  set_modal_search_results_: Setter<
    undefined | Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
  >;
} & (
  | {
      itemIndex_?: never;
      selected_index_?: never;
      currently_showing_suggestions_?: never;
    }
  | {
      itemIndex_: Accessor<number>;
      selected_index_: SelectedIndexType;
      currently_showing_suggestions_: CurrentlyShowingKeyboardSelectableItems;
    }
)) {
  const max_cards = itemIndex_ ? 5 : 4;
  const [read_current_instant_query, write_current_instant_query] = createSignal("");

  let timeout: ReturnType<typeof setTimeout>;
  createComputed(() => {
    const value = get_search_field_value();
    if (timeout == null) {
      // don't wait if it's the first request
      write_current_instant_query(value);
    }
    clearTimeout(timeout);
    timeout = setTimeout(
      catchify(() => write_current_instant_query(value)),
      250
    );
  });

  const [search_results] = createResource(
    createMemo(() => ({
      // <-- key order important, see comment below
      merchant: merchant_(),
      market: market_(),
      locale: i18n_.backend_locale_(),
      query: read_current_instant_query(),
    })),
    catchify(async (variable_data: { merchant: string; market: string; locale: string; query: string }) => {
      return depict_api_.query({
        // here it is (unfortunately) important that the keys in the object are in the same order as in SearchPage.tsx, because when JSON-encoding them to compare for caching the strings will be different otherwise
        limit: untrack(has_sort_or_filters_) ? max_cards : min_products_to_fetch_, // if there's no sorting or filters we can fetch min_products_to_fetch_ many since then the cached request can be re-used by the search page, otherwise, no reason to waste bytes
        ...variable_data,
      });
    })
  );

  const sliced_displays = createMemo(() => search_results()?.displays?.slice(0, max_cards));
  const displays_by_key_ = key_displays(() => (sliced_displays() || []) as Display[]);

  // Maybe we should move this createResource out of this component, on the other hand it bloats the parent component and if it fails it takes more than needed with it, so I think writing the content results from here is better
  // This is for the press-enter-to-instant-content-result feature which gets called from Autocomplete.tsx/TextSuggestions.tsx
  set_modal_search_results_(() => search_results);
  onCleanup(() => set_modal_search_results_(undefined)); // for consistency, in case this component crashes

  if (itemIndex_) {
    const [, set_currently_showing_suggestions] = currently_showing_suggestions_;
    setKeyboardNavigationEntry(
      set_currently_showing_suggestions,
      itemIndex_,
      createMemo(
        () =>
          sliced_displays()?.map(display => {
            const variant = display.variant_displays[display.variant_index];
            return { title_: variant.title, page_url_: variant.page_url };
          }) || []
      )
    );
  }

  let placeholder: HTMLElement;

  return (
    <Show when={sliced_displays()?.length !== 0}>
      <div class="instant-results" style={itemIndex_ && { order: itemIndex_() }}>
        <Show
          when={sliced_displays()?.length}
          fallback={createMemo(() => {
            if (Array.isArray(search_results()?.displays)) {
              // remove placeholders if we have a response but no results
              return undefined;
            }
            return new Array(max_cards)
              .fill(1)
              .map(() => (placeholder ||= DefaultInstantCardPlaceholder()).cloneNode(true));
          })()}
        >
          {(() => {
            return render_displays({
              displays_by_key_,
              product_card_template_: (display, info) => {
                const [index, setIndex] = createSignal<number>(0);

                info!.set_on_index_change(newIndex => setIndex(newIndex));

                return (
                  <DefaultInstantCard
                    display_={display!}
                    i18n_={i18n_}
                    router_={router_}
                    InstantCardImageComponent_={InstantCardImageComponent_}
                    index_={index}
                    keyboardNavigationGroupIndex_={itemIndex_!}
                    selected_index_={selected_index_!}
                  />
                );
              },
            });
          })()}
        </Show>
      </div>
    </Show>
  );
}
