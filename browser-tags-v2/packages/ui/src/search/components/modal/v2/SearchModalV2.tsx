/** @jsxImportSource solid-js */
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  onCleanup,
  Resource,
  Setter,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { catchify, Display, make_random_classname, ModernDisplay, observer } from "@depict-ai/utilishared";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import { DepictAPI } from "../../../../shared/DepictAPI";
import { InstantResults } from "../../InstantResults";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../../../helper_functions/keyboard_navigation_types";
import { format_number_of_results } from "../../../../shared/helper_functions/format_number_of_results";
import { ListingSuggestionAfterURLCreator, SearchResponseAfterDisplayTransformer } from "../../../types";
import { disable_scrolling } from "../../../helper_functions/disable_scrolling";
import { SentryErrorBoundary } from "../../../../shared/components/SentryErrorBoundary";
import { ListingProvider } from "../../../../shared/helper_functions/ListingContext";
import { VisualListingSuggestions } from "./VisualListingSuggestions";
import { send_instant_result_queries_to_ga } from "../../../helper_functions/send_instant_result_queries_to_ga";
import { SearchField } from "../../SearchField";
import { TextSuggestions } from "./TextSuggestions";
import { set_max_height_based_on_bottom_distance } from "../../../helper_functions/set_max_height_based_on_bottom_distance";
import { JsxStyle } from "../../../../shared/components/JsxStyle/JsxStyle";
import { DEPICT_ID } from "../../../../shared/ids";
import { request_suggestions } from "./request_suggestions";
import { ModernResponsiveContainedImage } from "../../../../shared/components/ModernResponsiveContainedImage";
import { backIconSymbol, modalVersionSymbol } from "../../../helper_functions/modalVersionSymbol";
import { BackIconV2 } from "../../../../shared/components/icons/BackIconV2";
import { autocomplete_keyboard_navigation } from "../../../helper_functions/autocomplete_keyboard_navigation";
import { instant_goto_content_results_functionality } from "../../../helper_functions/instant_goto_content_results_functionality";
import { useItemOrder } from "./useItemOrder";
import { close_modal_when_navigating_away } from "../../../helper_functions/close_modal_when_navigating_away";
import { unwrap_solid_jsx_element } from "../../../../shared/helper_functions/unwrap_solid_jsx_element";
import { ModalAlignmentSignals } from "../../../helper_functions/align_field";

/**
 * Second generation search modal - the solid component that gets added to <body> when the search modal is opened
 */
function RawSearchModalV2<InputDisplay extends Display, OutputDisplay extends ModernDisplay | never>({
  search_field_value_: props_search_field_value,
  get_search_query_,
  search_query_url_param_name_,
  previous_searches_,
  close_modal_,
  alignmentSignals_,
  depict_api_,
  merchant_,
  market_,
  submit_query_: props_submit_query,
  instant_results_options_,
  register_closing_animation_,
  url_transformer_,
  closing_animation_,
  clear_filters_,
  i18n_,
  disable_scrolling_ = true,
  enable_category_suggestions_,
  class_list_,
  bottom_distance_under_modal_,
  selected_text_range_,
  dont_sync_search_field_value_except_on_submit_ = false,
  router_,
  content_search_enabled_,
  sorting_query_param_,
  filter_query_param_prefix_,
  setSearchFieldOuterWidth_,
  forceUseDiv_,
}: {
  search_field_value_: Signal<string>;
  get_search_query_: Accessor<string>;
  search_query_url_param_name_: string;
  previous_searches_: Signal<string[]>;
  close_modal_: VoidFunction;
  alignmentSignals_?: ModalAlignmentSignals;
  depict_api_: DepictAPI<InputDisplay, OutputDisplay>;
  clear_filters_: (user_triggered: boolean) => void;
  merchant_: Accessor<string>;
  market_: Accessor<string>;
  submit_query_: (new_query?: string) => void;
  class_list_?: Accessor<Record<string, boolean>>;
  url_transformer_?: (url_object: URL) => unknown;
  disable_scrolling_?: boolean;
  closing_animation_?: () => Promise<any>;
  register_closing_animation_: (animation: () => Promise<any>) => void;
  bottom_distance_under_modal_?: Accessor<number | undefined>;
  selected_text_range_?: [number | null, number | null];
  router_: PseudoRouter;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  setSearchFieldOuterWidth_?: Setter<number>;
  /**
   * Whether to use a div instead of a <dialog>. Absolutely not recommended for anyone except the style editor in shopify where the modal shouldn't be overlaid over the whole page.
   */
  forceUseDiv_?: boolean;
  instant_results_options_: {
    min_products_to_fetch_: number;
    has_sort_or_filters_: Accessor<boolean>;
  };
  i18n_: solid_search_i18n;
  /** Should we include category suggestions. Defaults to true */
  enable_category_suggestions_?: boolean;
  dont_sync_search_field_value_except_on_submit_?: boolean;
  content_search_enabled_: Accessor<boolean>;
}) {
  let on_enter_in_search_field_function: ((e: KeyboardEvent) => boolean) | undefined;
  let listingSuggestionsDebounceTimeout: ReturnType<typeof setTimeout>;

  // As per feedback from stronger we sometimes want a modal with the search field value disconnected from the one in the rest of the UI, see https://depictaiworkspace.slack.com/archives/C02J16R9XEH/p1679065878487709.
  // This is desired for when the modal is opened from a UI element that visually does not look connected with the search page or current query
  // Basically the UI signals that the button that opens the modal starts a new search.
  const search_field_value_ = dont_sync_search_field_value_except_on_submit_
    ? createSignal("")
    : props_search_field_value;
  const propagate_search_field_value_back = dont_sync_search_field_value_except_on_submit_
    ? () => props_search_field_value[1](untrack(search_field_value_[0])) // Set actual search field value to the throwaway internal one before submitting
    : undefined;
  const submit_query_ = (...args: Parameters<typeof props_submit_query>) => {
    // submit_query expects to read the current search field value which is why we have to write the current one to the signal before calling it
    // It will write the old one back and then write the new one after submit
    propagate_search_field_value_back?.();
    return props_submit_query(...args);
  };

  const [input_field, set_input_field] = createSignal<HTMLInputElement>();
  const [searching_for_value_, set_searching_for_value_] = createSignal<undefined | string>();
  const [show_stale_content_results_, set_show_stale_content_results_] = createSignal(false);
  // For fake debounce
  const [showStaleListingSuggestions, setShowStaleListingSuggestions] = createSignal(false);
  const suggestions_updating_blocked_ = createSignal<boolean>(false);
  const [modalBodyWidth, setModalBodyWidth] = createSignal(0);
  const modalLayoutStacked_ = createMemo(() => modalBodyWidth() < 650);
  const itemIndexes = useItemOrder(modalLayoutStacked_);
  const [get_search_field_value_] = search_field_value_;
  const [suggestions_updating_blocked] = suggestions_updating_blocked_;
  const [unfiltered_previous_searches] = previous_searches_;
  const random_classname_body = make_random_classname();
  const backdropRandomClassname = make_random_classname();
  const [get_modal_search_results_, set_modal_search_results_] = createSignal<
    undefined | Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
  >();
  const close_on_escape_handler = catchify((evt: KeyboardEvent) => {
    if (evt.key === "Escape") {
      evt.preventDefault(); // Prevent the browser from closing/cancelling the modal so our animations have time to run
      close_modal_();
    }
  });
  const selected_index_: SelectedIndexType = createSignal();
  const currently_showing_suggestions_ = createSignal<ReturnType<CurrentlyShowingKeyboardSelectableItems[0]>>([], {
    equals: false,
  });

  const suggestions_response_ = request_suggestions({
    depict_api_,
    search_field_value_: get_search_field_value_,
    selected_index_,
    merchant_,
    market_,
    i18n_,
    suggestions_updating_blocked_: suggestions_updating_blocked,
    set_searching_for_value_,
    set_show_stale_content_results_,
  });
  const listing_suggestions_ = createMemo<ListingSuggestionAfterURLCreator[] | undefined>(prev => {
    const all = (enable_category_suggestions_
      ? suggestions_response_()?.filter(item => item.type === "listing")
      : []) as unknown as ListingSuggestionAfterURLCreator[] | undefined;

    // To prevent jumping of the modal when the visual listing suggestions exist/don't exist we debounce it the same way as the product results
    if (showStaleListingSuggestions() && !all?.length) return prev;

    if (modalLayoutStacked_()) return all;
    return all?.slice(0, 3);
  });
  const previous_searches_without_current_query = createMemo(
    () => [...unfiltered_previous_searches()].reverse().filter(q => q !== get_search_query_())
    // don't want to return the current query
  );
  const previous_searches_matching_query = createMemo(() => {
    return previous_searches_without_current_query()
      .filter(cs_search => {
        const search = cs_search.toLowerCase();
        const value = searching_for_value_()?.toLowerCase();
        if (!value) {
          return cs_search;
        }
        return search.includes(value) || value.includes(search);
      })
      .slice(0, 3);
  });
  const contentResultsToShow_ = createMemo<{ title_: string; page_url_: string }[]>(prev => {
    if (!content_search_enabled_()) return [];
    // don't update content results when query suggestions don't update because otherwise they disappear when trying to keyboard navigate to them
    if (show_stale_content_results_()) return prev;
    return (
      get_modal_search_results_()?.()
        ?.content_search_links?.map(
          link =>
            ({
              page_url_: link.page_url,
              title_: link.title,
            }) as const
        )
        .slice(0, 3) || []
    );
  }, []);
  // Ideally we'd propagate up the suggestion signal too and call this from SearchModal.tsx? Because it's not super related with autocomplete, but it's not a huge feature, and it's easier here so keeping it.
  // It's the functionality to open the content results page when you press enter, in the modal, when there's only one content result
  const manipulated_set_override_on_enter_fn_ = instant_goto_content_results_functionality({
    set_override_on_enter_fn_: (new_fn: (e: KeyboardEvent) => boolean) => (on_enter_in_search_field_function = new_fn),
    get_modal_search_results_,
    suggestions_response_,
    router_,
    content_results_: contentResultsToShow_,
    has_previous_searches_matching_query_: createMemo(() => previous_searches_matching_query().length > 0),
  });
  // total number of results = content results + product results + category suggestions
  const totalNumberResults = createMemo(() => {
    const results = get_modal_search_results_()?.();
    // Show actual number of result (more accurate) if there's no cursor (backend doesn't have more products)
    const hits = results?.cursor ? results?.n_hits : results?.displays?.length;
    const content_results = (content_search_enabled_() && results?.content_search_links?.length) || 0;
    const category_results = listing_suggestions_()?.length || 0;
    return (hits ?? 0) + content_results + category_results;
  });
  const formattedTotalNumberResults = format_number_of_results({
    number_: totalNumberResults,
    i18n_,
  });
  const {
    body_: bodyAlignmentSignal = createSignal({}),
    field_: [getFieldAlignmentStyling] = createSignal({}),
    backdrop_: [getBackdropStyling] = createSignal({}),
  } = alignmentSignals_ || {};
  const [bodyAlignmentStyle] = bodyAlignmentSignal;
  const mergedCssObject = createMemo(() => {
    // We can't set the alignment styling as inline styles due to them getting a too high precedence (not easy to override) so we put them into a <style> tag
    // In the V2 modal, we need to be able to target both the search field and modal body from align_field which does the alignment because the search field doesn't take the whole width of the modal
    const modalBodyStyle = { width: "80vw", position: "absolute", ...bodyAlignmentStyle() } as const;
    return {
      [`.depict .${random_classname_body}`]: modalBodyStyle,
      [`.depict .${backdropRandomClassname}`]: getBackdropStyling(),
      [`.depict .${random_classname_body} .search-field .field`]: getFieldAlignmentStyling(),
    };
  });
  const noResults = createMemo<boolean>(
    prev =>
      ((get_modal_search_results_()?.loading === false && !suggestions_response_.loading) || !!prev) &&
      totalNumberResults() === 0 &&
      previous_searches_matching_query().length === 0
  );

  if (disable_scrolling_) {
    disable_scrolling();
  }

  close_modal_when_navigating_away(close_modal_, search_query_url_param_name_);
  addEventListener("keydown", close_on_escape_handler);
  onCleanup(() => removeEventListener("keydown", close_on_escape_handler));

  createEffect(
    on(
      get_search_field_value_,
      () => {
        setShowStaleListingSuggestions(true);
        clearTimeout(listingSuggestionsDebounceTimeout);
        listingSuggestionsDebounceTimeout = setTimeout(
          catchify(() => setShowStaleListingSuggestions(false)),
          350
        );
      },
      { defer: true }
    )
  );

  if (closing_animation_) {
    register_closing_animation_(closing_animation_);
  }

  send_instant_result_queries_to_ga({
    get_search_field_value_,
    url_transformer_,
    search_query_url_param_name_,
    get_search_query_,
  });

  autocomplete_keyboard_navigation({
    element_: input_field,
    selected_index_: selected_index_,
    search_field_value_,
    updating_blocked_: suggestions_updating_blocked_,
    currently_showing_suggestions_,
    set_override_on_enter_fn_: manipulated_set_override_on_enter_fn_,
    search_query_param_name_: search_query_url_param_name_,
    url_transformer_,
    router_,
  });

  const renderedTextSuggestions = unwrap_solid_jsx_element(
    <SentryErrorBoundary severity_="error" message_="Query suggestions failed">
      <TextSuggestions
        search_field_value_={search_field_value_}
        previous_searches_={previous_searches_}
        search_query_url_param_name_={search_query_url_param_name_}
        selected_index_={selected_index_}
        currently_showing_suggestions_={currently_showing_suggestions_}
        url_transformer_={url_transformer_}
        i18n_={i18n_}
        router_={router_}
        submit_query_={submit_query_}
        suggestions_response_={suggestions_response_}
        suggestions_updating_blocked_={suggestions_updating_blocked_}
        searching_for_value_={searching_for_value_}
        previous_searches_matching_query_={previous_searches_matching_query}
        contentResultsToShow_={contentResultsToShow_}
        itemIndexes_={itemIndexes}
        noResults_={noResults}
        merchant_={merchant_}
        market_={market_}
        depict_api_={depict_api_}
        get_modal_search_results_={get_modal_search_results_}
      />
    </SentryErrorBoundary>
  );
  const renderedVisualSuggestions = unwrap_solid_jsx_element(
    <>
      <SentryErrorBoundary severity_="error" message_="Instant results failed">
        <ListingProvider>
          <div class="instant-results-wrapper" style={{ order: itemIndexes.instantResultsIndex_() }}>
            <h2>{i18n_.products_()}</h2>
            {InstantResults<InputDisplay, OutputDisplay>({
              search_field_value_,
              depict_api_,
              merchant_,
              i18n_,
              market_,
              router_,
              set_modal_search_results_,
              itemIndex_: itemIndexes.instantResultsIndex_,
              selected_index_,
              currently_showing_suggestions_,
              InstantCardImageComponent_: props => (
                <ModernResponsiveContainedImage
                  src={props.src_}
                  // So merchants don't have to specify aspect ratio
                  autoAdjustAspectRatio={true}
                  // Let people override aspect ratio with css variable
                  aspectRatio={1}
                  class={props.class_}
                  imgProps={{ alt: "Product image" }}
                />
              ),
              ...instant_results_options_,
            })}
          </div>
        </ListingProvider>
      </SentryErrorBoundary>
      <SentryErrorBoundary severity_="error" message_="Visual listing suggestions failed">
        <ListingProvider>
          <Show when={enable_category_suggestions_ ?? true}>
            <VisualListingSuggestions
              listing_suggestions_={listing_suggestions_}
              i18n_={i18n_}
              router_={router_}
              sorting_query_param_={sorting_query_param_}
              filter_query_param_prefix_={filter_query_param_prefix_}
              merchant_={merchant_}
              itemIndex_={itemIndexes.listingSuggestionsIndex_}
              selected_index_={selected_index_}
              currently_showing_suggestions_={currently_showing_suggestions_}
              modalLayoutStacked_={modalLayoutStacked_}
              showPlaceholders_={() => !suggestions_response_.latest}
            />
          </Show>
        </ListingProvider>
      </SentryErrorBoundary>
    </>
  );

  const DialogElement = (props: { children: JSX.Element } & JSX.DialogHtmlAttributes<HTMLDialogElement>) => {
    if (forceUseDiv_) {
      return <div {...(props as JSX.HTMLAttributes<HTMLDivElement>)}>{props.children}</div>;
    }
    return <dialog {...props}>{props.children}</dialog>;
  };
  const discoverMoreSection = (
    <div class="discover-more">
      <button onClick={catchify(() => submit_query_())} class="major" type="button">
        <Show when={get_search_field_value_()} fallback={i18n_.modal_discover_more_()}>
          <Show when={totalNumberResults()} fallback={i18n_.modal_view_all_no_results_()}>
            {i18n_.modal_view_all_results_()((<b>{formattedTotalNumberResults()}</b>) as HTMLElement)}
          </Show>
        </Show>
      </button>
    </div>
  ) as HTMLDivElement;
  const search_field = SearchField({
    BackIcon_: BackIconV2,
    input_field_ref_: element => set_input_field(element),
    override_on_enter_: e => on_enter_in_search_field_function?.(e),
    on_back_: close_modal_,
    search_field_value_,
    submit_query_,
    clear_filters_,
    i18n_,
    after_focusing_: input_el => {
      // Restore the selection range from the SearchField that was used to open the modal, if it was saved.
      if (!selected_text_range_) return;
      const [start, end] = selected_text_range_;
      if (start === null || end === null) return;
      input_el.setSelectionRange(start, end);
    },
    setSearchRoleOnContainer_: false,
    ariaControls: "depict-suggestions-and-result-preview",
  });

  if (setSearchFieldOuterWidth_) {
    const resizeObserver = new ResizeObserver(
      catchify(records => setSearchFieldOuterWidth_(records.at(-1)!.contentRect.width))
    );
    resizeObserver.observe(search_field);
    onCleanup(() => resizeObserver.disconnect());
  }

  return [
    (
      // Use dialog element for accessibility (stuff below automatically becomes none-interactive)
      <DialogElement
        id={DEPICT_ID.SEARCH_MODAL}
        class="depict plp search"
        classList={class_list_?.()}
        onClose={close_modal_} // We override the browser from closing the modal due to the animations, but in case someone finds a way to close it, we want to remove our DOM elements
        ref={element => {
          if (forceUseDiv_) return;
          const disconnect = observer.onexists<HTMLDialogElement>(element, ({ element, disconnector }) => {
            element.showModal();
            disconnector();
          });
          onCleanup(disconnect);
        }}
      >
        <div
          class="depict-search-modal-backdrop"
          onClick={close_modal_}
          classList={{ [backdropRandomClassname]: true }}
        />
        <div
          class="depict-search-modal"
          classList={{ stacked: modalLayoutStacked_() }}
          onClick={catchify(({ target, currentTarget }: MouseEvent) => {
            if (target === currentTarget) {
              close_modal_();
            }
          })}
        >
          <div
            class="body"
            classList={{ [random_classname_body]: true }}
            ref={element => {
              // We don't have contained queries in JS so use ResizeObserver instead. This is so that the modal automatically assumes a mobile layout when aligning with a short SearchField.
              const resizeObserver = new ResizeObserver(
                catchify(records => setModalBodyWidth(records.at(-1)!.contentRect.width))
              );
              resizeObserver.observe(element);
              onCleanup(() => resizeObserver.disconnect());
            }}
            role="search"
            aria-label="Search modal with search field, query suggestions and result preview"
          >
            {search_field}
            <div
              id="depict-suggestions-and-result-preview"
              class="padded"
              classList={{ "no-results": noResults() }}
              ref={el => {
                catchify(set_max_height_based_on_bottom_distance)(
                  el,
                  bodyAlignmentSignal,
                  bottom_distance_under_modal_ || (() => 0.03) // 3% under SearchModalV2 by default
                );

                // Workaround part 2 of https://github.com/solidjs/solid/issues/2030
                // We can't just re-render the components in the two different <Show> branches because <Show> would infinite loop because it depends on the resource created by the components
                // We could also lift out the createResource from InstantResults into this component, but this component is already huge.

                // When no results, also don't show left/right separation
                const showStackedDOM = createMemo(() => modalLayoutStacked_() || noResults());

                createEffect(() => {
                  if (showStackedDOM()) {
                    el.replaceChildren(
                      ...(renderedTextSuggestions() as (string | Node)[]),
                      ...(renderedVisualSuggestions() as (string | Node)[]),
                      discoverMoreSection
                    );
                    return;
                  }
                  el.replaceChildren(
                    ...((
                      <>
                        <div class="left">{renderedTextSuggestions()}</div>
                        <div class="right">{renderedVisualSuggestions()}</div>
                        {discoverMoreSection}
                      </>
                    ) as HTMLDivElement[])
                  );
                });
              }}
            >
              {/* DO NOT ADD CHILDREN HERE; SEE BUG WORKAROUND COMMENTS ABOVE */}
            </div>
          </div>
          <JsxStyle styles={mergedCssObject} />
        </div>
      </DialogElement>
    ) as HTMLDivElement,
  ];
}

export const SearchModalV2 = /*@__PURE__*/ (() => {
  RawSearchModalV2[modalVersionSymbol] = 2;
  RawSearchModalV2[backIconSymbol] = BackIconV2;
  return RawSearchModalV2;
})();
