/** @jsxImportSource solid-js */
import { Accessor, createMemo, createSignal, JSX, onCleanup, Resource, Show, Signal, untrack } from "solid-js";
import { catchify, ContainedImage, make_random_classname } from "@depict-ai/utilishared";
import { InstantResults } from "../../InstantResults";
import { solid_search_i18n } from "../../../../locales/i18n_types";
import { PseudoRouter } from "../../../../shared/helper_functions/pseudo_router";
import { format_number_of_results } from "../../../../shared/helper_functions/format_number_of_results";
import { SearchResponseAfterDisplayTransformer } from "../../../types";
import {
  CurrentlyShowingKeyboardSelectableItems,
  SelectedIndexType,
} from "../../../helper_functions/keyboard_navigation_types";
import { send_instant_result_queries_to_ga } from "../../../helper_functions/send_instant_result_queries_to_ga";
import { set_max_height_based_on_bottom_distance } from "../../../helper_functions/set_max_height_based_on_bottom_distance";
import { Autocomplete } from "./Autocomplete";
import { JsxStyle } from "../../../../shared/components/JsxStyle/JsxStyle";
import { DEPICT_ID } from "../../../../shared/ids";
import { SearchField } from "../../SearchField";
import { DepictAPI } from "../../../../shared/DepictAPI";
import { disable_scrolling } from "../../../helper_functions/disable_scrolling";
import { media_query_to_accessor } from "../../../../shared/helper_functions/media_query_to_accessor";
import { SentryErrorBoundary } from "../../../../shared/components/SentryErrorBoundary";
import { ListingProvider } from "../../../../shared/helper_functions/ListingContext";
import { backIconSymbol, modalVersionSymbol } from "../../../helper_functions/modalVersionSymbol";
import { ClassicBackIcon } from "../../../../shared/components/icons/ClassicBackIcon";
import { close_modal_when_navigating_away } from "../../../helper_functions/close_modal_when_navigating_away";
import { ModalAlignmentSignals } from "../../../helper_functions/align_field";

/**
 * First generation (classic) search modal - the solid component that gets added to <body> when the search modal is opened
 */
function RawClassicSearchModal({
  search_field_value_: props_search_field_value,
  get_search_query_,
  search_query_url_param_name_,
  previous_searches_,
  close_modal_,
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
  alignmentSignals_,
}: {
  search_field_value_: Signal<string>;
  get_search_query_: Accessor<string>;
  search_query_url_param_name_: string;
  previous_searches_: Signal<string[]>;
  close_modal_: VoidFunction;
  depict_api_: DepictAPI<any>;
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
  alignmentSignals_?: ModalAlignmentSignals;
  selected_text_range_?: [number | null, number | null];
  router_: PseudoRouter;
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
  const [get_search_field_value_] = search_field_value_;
  // Search field alignment unused in ClassicSearchModal since the search field spans the whole modal
  const { body_: bodyAlignmentSignal = createSignal({}) } = alignmentSignals_ || {};
  const [bodyAlignmentStyle] = bodyAlignmentSignal;
  const [get_modal_search_results, set_modal_search_results_] = createSignal<
    undefined | Resource<(SearchResponseAfterDisplayTransformer & { failed?: true | undefined }) | undefined>
  >();
  const close_on_escape_handler = catchify(({ key }: KeyboardEvent) => {
    if (key === "Escape") {
      close_modal_();
    }
  });
  // total number of results = content results + product results
  const totalNumberOfResults = createMemo(() => {
    const results = get_modal_search_results()?.();
    const hits = results?.n_hits;
    const content_results = results?.content_search_links?.length;
    if (!content_results || !content_search_enabled_()) return hits;
    return (hits ?? 0) + content_results;
  });
  const formattedTotalNumberResults = format_number_of_results({
    number_: totalNumberOfResults,
    i18n_,
  });
  const selected_index: SelectedIndexType = createSignal();
  const currently_showing_suggestions_ = createSignal<ReturnType<CurrentlyShowingKeyboardSelectableItems[0]>>([], {
    equals: false,
  });
  const less_than_700_high = media_query_to_accessor("(max-height:700px)");
  const DiscoverMoreSection = () => (
    <div class="discover-more">
      <button onClick={catchify(() => submit_query_())} class="major" type="button">
        <Show when={get_search_field_value_()} fallback={i18n_.modal_discover_more_()}>
          <Show when={totalNumberOfResults()} fallback={i18n_.modal_view_all_no_results_()}>
            {i18n_.modal_view_all_results_()((<b>{formattedTotalNumberResults()}</b>) as HTMLElement)}
          </Show>
        </Show>
      </button>
    </div>
  );

  if (disable_scrolling_) {
    disable_scrolling();
  }

  close_modal_when_navigating_away(close_modal_, search_query_url_param_name_);

  window.addEventListener("keydown", close_on_escape_handler);
  onCleanup(catchify(() => window.removeEventListener("keydown", close_on_escape_handler)));

  if (closing_animation_) {
    register_closing_animation_(closing_animation_);
  }

  send_instant_result_queries_to_ga({
    get_search_field_value_,
    url_transformer_,
    search_query_url_param_name_,
    get_search_query_,
  });

  const random_classname = make_random_classname();

  const body_style = createMemo(() => {
    const style_obj = { width: "80vw", position: "absolute", ...bodyAlignmentStyle() } as const;
    return { [`.depict .${random_classname}`]: style_obj };
  });

  const search_field = SearchField({
    BackIcon_: ClassicBackIcon,
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

  const modal_element = (
    <div
      class={`depict-search-modal`}
      onClick={catchify(({ target }: MouseEvent) => {
        if (target === modal_element) {
          close_modal_();
        }
      })}
    >
      <div
        class={`body`}
        classList={{ [random_classname]: true }}
        role="search"
        aria-label="Search modal with search field, query suggestions and result preview"
      >
        {search_field}
        <div
          id="depict-suggestions-and-result-preview"
          class="padded"
          ref={el =>
            catchify(set_max_height_based_on_bottom_distance)(el, bodyAlignmentSignal, bottom_distance_under_modal_)
          }
        >
          <SentryErrorBoundary severity_="error" message_="Autocomplete/suggestions failed">
            <Autocomplete
              set_override_on_enter_fn_={(new_fn: (e: KeyboardEvent) => boolean) =>
                (on_enter_in_search_field_function = new_fn)
              }
              input_field_={input_field}
              search_field_value_={search_field_value_}
              previous_searches_text_={i18n_.previous_searches_text_}
              get_search_query_={get_search_query_}
              previous_searches_={previous_searches_}
              search_query_url_param_name_={search_query_url_param_name_}
              market_={market_}
              merchant_={merchant_}
              selected_index_={selected_index}
              currently_showing_suggestions_={currently_showing_suggestions_}
              depict_api_={depict_api_}
              url_transformer_={url_transformer_}
              i18n_={i18n_}
              include_category_suggestions_={enable_category_suggestions_ ?? true}
              router_={router_}
              submit_query_={submit_query_}
              get_modal_search_results_={get_modal_search_results}
              content_search_enabled_={content_search_enabled_}
            />
          </SentryErrorBoundary>
          <SentryErrorBoundary severity_="error" message_="Instant results failed">
            <ListingProvider>
              {InstantResults({
                search_field_value_,
                depict_api_,
                merchant_,
                i18n_,
                market_,
                router_,
                set_modal_search_results_,
                InstantCardImageComponent_: props =>
                  createMemo(() =>
                    ContainedImage({
                      loading: "lazy",
                      aspect_ratio: 1,
                      alt: "",
                      rendering_options: {},
                      "src": props.src_,
                      srcset_opts: { set_dataset: false },
                      sizes: "0px",
                    })
                  ) as unknown as JSX.Element,
                ...instant_results_options_,
              })}
            </ListingProvider>
          </SentryErrorBoundary>
          <Show when={less_than_700_high()}>
            <DiscoverMoreSection />
          </Show>
        </div>
        <Show when={!less_than_700_high()}>
          <DiscoverMoreSection />
        </Show>
      </div>
      <JsxStyle styles={body_style} />
    </div>
  );

  return [
    (
      <div id={DEPICT_ID.SEARCH_MODAL} class="depict plp search" classList={class_list_?.()} role="dialog">
        <div class="depict-search-modal-backdrop" onClick={close_modal_} />
        {modal_element}
      </div>
    ) as HTMLDivElement,
  ];
}

export const ClassicSearchModal = /*@__PURE__*/ (() => {
  RawClassicSearchModal[modalVersionSymbol] = 1;
  RawClassicSearchModal[backIconSymbol] = ClassicBackIcon;
  return RawClassicSearchModal;
})();
