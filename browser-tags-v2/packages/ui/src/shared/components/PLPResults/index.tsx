/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createReaction,
  createSignal,
  JSX as solid_JSX,
  on,
  onCleanup,
  Resource,
  Setter,
  Show,
  Signal,
  Suspense,
} from "solid-js";
import { Display, LayoutOptions, slider_fractional_factory } from "@depict-ai/utilishared";
import { ProductListingResponseV3 } from "@depict-ai/types/api/ProductListingResponseV3";
import { DepictAPI } from "../../DepictAPI";
import { BaseQueryAccessor, ProductCardTemplate, ScrollRestorationData } from "../../types";
import { NoResults } from "./NoResults";
import { create_cols_at_size_comment } from "../../helper_functions/create_cols_at_size_comment";
import { SentryErrorBoundary } from "../SentryErrorBoundary";
import { Placeholders } from "../../helper_functions/card_rendering/placeholder_rendering";
import { num_extra_placeholders } from "../../helper_functions/magic_numbers";
import { ResultsProductCards } from "./results_product_cards";
import { SolidLayout, SolidLayoutWithProvidedElement } from "../SolidLayout";
import { CSSGridLayout } from "../CSSGridLayout";
import { make_modified_cols_at_size } from "./make_modified_cols_at_size";
import { ContentBlocksByRow, create_content_blocks } from "./create_content_blocks";
import { SlidableItems } from "../SlidableItems";
import { insert } from "solid-js/web";
import { PossibleLayout } from "../../../sdks/types";
import { SearchResponseAfterDisplayTransformer } from "../../../search/types";

export type ModifiedLayoutOptionsAccessor = Accessor<
  Omit<LayoutOptions, "container_element" | "rows" | "layout" | "disable_partial_rows"> & { layout?: PossibleLayout }
>;

export function PLPResults<T extends Display>({
  plp_results_,
  depict_api_,
  all_products_loaded_,
  min_products_to_fetch_,
  query_base_,
  first_result_in_viewport_,
  last_result_in_viewport_,
  scroll_restoration_data_: [get_scroll_restoration_data],
  no_results_options_,
  desktop_filter_elements_,
  sort_or_filter_open_,
  product_card_template_,
  layout_options_,
  id_currently_querying_for_,
  content_blocks_by_row_,
  ConfiguredScrollStatus_,
  setCurrentlyLoadedDisplays_,
  showSliderArrow_,
}: {
  product_card_template_: ProductCardTemplate<T>;
  layout_options_: ModifiedLayoutOptionsAccessor;
  plp_results_: Resource<SearchResponseAfterDisplayTransformer | ProductListingResponseV3 | undefined>;
  all_products_loaded_: Signal<boolean>;
  setCurrentlyLoadedDisplays_: Setter<number>;
  depict_api_: DepictAPI<T>;
  first_result_in_viewport_: Signal<number | undefined>;
  last_result_in_viewport_: Signal<number | undefined>;
  min_products_to_fetch_: number;
  query_base_: BaseQueryAccessor & { loading: boolean };
  scroll_restoration_data_: Signal<ScrollRestorationData>;
  no_results_options_: Parameters<typeof NoResults>[0];
  showSliderArrow_: Accessor<boolean | undefined>;
  desktop_filter_elements_: Accessor<solid_JSX.Element>;
  sort_or_filter_open_: Accessor<boolean>;
  id_currently_querying_for_: Accessor<string>;
  content_blocks_by_row_: Accessor<ContentBlocksByRow | undefined>;
  ConfiguredScrollStatus_?: (extraProps?: {
    get_scroll_position_?: () => number;
    listen_to_scroll_on_?: Element;
    velocity_too_fast_?: number;
  }) => solid_JSX.Element;
}) {
  // The plp_results_ resource will be delayed because we're using createBatchedMemo to not make triplicate API requests, but we need to show the placeholders before already to match Chrome and Firefox's "content has to be there, ready for scroll restoration, before all popstate tasks have been completed"-requirement

  const is_loading_ = createMemo(() => plp_results_.loading || query_base_.loading);
  const has_no_results_or_failed = createMemo(() => {
    const displays = plp_results_()?.displays;
    return !is_loading_() && (!Array.isArray(displays) || !displays.length);
  });

  if (all_products_loaded_) {
    // This is for the case that all products were loaded in the first result I think?
    createComputed(() => {
      const is_at_end = !plp_results_()?.cursor; // or failed, but we don't wanna / it's not easy to retry
      if (!is_loading_() && is_at_end) {
        all_products_loaded_[1](true);
      }
    });
  }

  return (
    <div class="PLP-results" classList={{ nothing: has_no_results_or_failed() }}>
      <Show when={!has_no_results_or_failed()} fallback={<NoResults {...no_results_options_} />}>
        {SentryErrorBoundary({
          severity_: "error",
          // More granular error handling
          // This _also_ fails when a product card rendering fails
          on_error_: retry => {
            // re-try / reset ErrorBoundary next time we're getting product cards
            const track = createReaction(retry);
            track(plp_results_);
          },
          class_list_: ["cards"], // So that the styling looks pretty when we've failed
          message_: "Result rendering failed",
          get children() {
            let suspense_contents: solid_JSX.Element | undefined;
            let is_just_after_plp_results_update = false;
            let fallback_is_alive = false;

            const [get_should_have_placeholders_rendered, set_should_have_placeholders_rendered] = createSignal(true);
            const [top_row_shortened_by_, set_top_row_shortened_by_] = createSignal(0);
            createSignal(false);
            const modified_cols_at_size = make_modified_cols_at_size({ layout_options_, sort_or_filter_open_ });
            const num_placeholders_ = createMemo(() => {
              // Can't use the data out of request_base for the id because request_base is too late, we need the correct amount of placeholders before the browser has restored the scroll state after processing all popstate events
              return (
                num_extra_placeholders +
                (get_scroll_restoration_data().find(({ for_id }) => for_id === id_currently_querying_for_())
                  ?.min_results_loaded ?? min_products_to_fetch_)
              );
            });
            const layout = createMemo(() => {
              const incoming_layout = layout_options_().layout;
              if (incoming_layout === "slider-without-filters") return "slider";
              return incoming_layout || "grid";
            });
            const doesnt_have_content_blocks = createMemo(() => !content_blocks_by_row_() || layout() !== "grid");
            const content_blocks_ = createMemo(() =>
              doesnt_have_content_blocks()
                ? // This bailing here is to not use proxy/stores and retain old browser compatibility when no content blocks are present
                  () => []
                : create_content_blocks({
                    content_blocks_: content_blocks_by_row_,
                    cols_at_size_: modified_cols_at_size,
                    set_top_row_shortened_by_,
                  })
            );
            const rendered_placeholders = createMemo(() => {
              if (get_should_have_placeholders_rendered()) {
                return Placeholders({
                  content_blocks_,
                  product_card_template_,
                  num_placeholders_,
                });
              }
            });
            const [get_suspense_is_blocked, set_suspense_is_blocked] = createSignal(false);
            const block_suspense_if_needed = () => {
              if (!is_just_after_plp_results_update) return;
              is_just_after_plp_results_update = false;
              fallback_is_alive = false;
              set_suspense_is_blocked(true);
            };

            createComputed(() => {
              if (!is_loading_()) return;
              set_should_have_placeholders_rendered(true);
              set_suspense_is_blocked(false);
              is_just_after_plp_results_update = true;
            });

            createEffect(
              on(
                plp_results_,
                () => {
                  if (!fallback_is_alive) {
                    // if all product card rendering functions after the initial rendering are synchronous the suspense boundary will never go into the fallback, so we don't know when they have finished rendering, and we can't block the suspense. Therefore, we're just doing it with this effect
                    block_suspense_if_needed();
                    set_should_have_placeholders_rendered(false);
                  }
                },
                { defer: true }
              )
            );

            /*
               This suspense ensures that if someone has async templates, we still show placeholders until the product cards actually have finished rendering (automagically since they're createResource's)
               We're creating it outside the <Show> so that we can benefit from <For>'s optimisation between changing results
               (For the whole idea of the displays being cached to work we can't tear down and re-run ProductCards for every new result.
               We have to keep ProductCards alive, but hidden, and feed them new data as soon as we had it)
            */
            const product_cards_when_data = (
              <Suspense
                fallback={(() => {
                  fallback_is_alive = true;
                  onCleanup(block_suspense_if_needed); // Block suspense after initial run every time after we fetch

                  return createMemo(() => {
                    // We need to be able to block the suspense since when async product cards are *rendering* we want to show the placeholders on initial load but not when loading more
                    // In future we could have individual suspense's for each product card, but that's too much for now
                    if (get_suspense_is_blocked()) return suspense_contents;
                    set_should_have_placeholders_rendered(true); // just in case
                    onCleanup(() => set_should_have_placeholders_rendered(false));
                    return rendered_placeholders; // I lifted the placeholders into the memo since we don't want to re-render them when switching from <Show> to <Suspense>
                  }) as unknown as solid_JSX.Element;
                })()}
              >
                {(() => {
                  suspense_contents = ResultsProductCards<T>({
                    product_card_template_,
                    plp_results_,
                    last_result_in_viewport_,
                    first_result_in_viewport_,
                    all_products_loaded_,
                    min_products_to_fetch_,
                    query_base_,
                    depict_api_,
                    is_loading_,
                    content_blocks_,
                    setCurrentlyLoadedDisplays_,
                    isSliderLayout_: () => layout() === "slider",
                  });
                  onCleanup(() => (suspense_contents = undefined));
                  return suspense_contents;
                })()}
              </Suspense>
            );

            /* This Show is so that we show placeholders while query_base is loading and because it's cumbersome to ensure that everything that directly accesses the plp_results_ resource is within the <Suspense> boundary */
            const listing_contents = (
              <Show when={!is_loading_()} fallback={rendered_placeholders()}>
                {product_cards_when_data}
                {/* DO NOT MOVE THE RENDERING INSIDE THIS SHOW LIKE I DID IN https://gitlab.com/depict-ai/depict.ai/-/commit/1a92e194fc84622ae439aa6dceb4ba9a49c53a4f */}
              </Show>
            );

            return (
              <>
                {create_cols_at_size_comment(layout())}
                <Show
                  when={doesnt_have_content_blocks()}
                  fallback={
                    <CSSGridLayout
                      cols_at_size={modified_cols_at_size()}
                      override_vertical_spacing={layout_options_().override_vertical_spacing}
                      grid_spacing={layout_options_().grid_spacing}
                      element_attributes={{ class: "cards css-grid" }}
                      top_row_shortened_by_={top_row_shortened_by_}
                    >
                      {listing_contents}
                    </CSSGridLayout>
                  }
                >
                  {/* If there are no content blocks, render "the old way" like we do in search recs and recs*/}
                  {/* The advantage is compatibility and not changing the way styling and class names work for old customers = we can release content blocks without breaking anything*. Also we can support sliders. */}
                  <Show
                    when={layout() === "grid"}
                    fallback={
                      <SlidableItems
                        arrow_height_={25}
                        arrow_width_={12.5}
                        disable_fading_={true}
                        showArrow_={showSliderArrow_()}
                        slider_ref_={slider => {
                          const { insert_here, container } = slider;
                          const Layout = (props: Parameters<typeof SolidLayoutWithProvidedElement>[0]) =>
                            SolidLayoutWithProvidedElement(props, insert_here as HTMLDivElement, true);
                          // Do like this, so we don't have to call mergeProps ourselves
                          <Layout
                            {...layout_options_()}
                            rows="all"
                            cols_at_size={modified_cols_at_size()}
                            layout={layout()}
                          />;

                          insert_here.classList.add("generated-spacing");
                          container.classList.add("products");

                          createEffect(
                            // @ts-ignore
                            on(query_base_, () => insert_here.scrollTo({ left: 0, behavior: "instant" }), {
                              defer: true,
                            })
                          ); // Scroll to the beginning if a filter or the query changes

                          slider_fractional_factory(0, 0.75).constructor_plugin.call(slider, {}); // enable fractional scrolling

                          if (ConfiguredScrollStatus_) {
                            // Put scroll status into slider container, so it's centered relatively to the products
                            const rendered_scroll_status = ConfiguredScrollStatus_({
                              get_scroll_position_: () => insert_here.scrollLeft,
                              listen_to_scroll_on_: insert_here,
                              velocity_too_fast_: 3, // Require twice as hard scrolling to show ScrollStatus in slider since it's easier to scroll fast there
                            });
                            const non_solid_nodes = [...container.childNodes];
                            // We have to use `insert` over Element.append, because ConfiguredScrollStatus is in an ErrorBoundary and therefore returns a function. `insert` will wipe all children, therefore save them first and then tell insert that the element should contain these elements + whatever ScrollStatus returns
                            insert(
                              container,
                              createMemo(() => [...non_solid_nodes, rendered_scroll_status])
                            );
                          }
                        }}
                      >
                        {listing_contents}
                      </SlidableItems>
                    }
                  >
                    <SolidLayout
                      cols_at_size={modified_cols_at_size()}
                      override_vertical_spacing={layout_options_().override_vertical_spacing}
                      grid_spacing={layout_options_().grid_spacing}
                      rows="all"
                      layout={layout()}
                      element_attributes={{ class: "cards" }}
                    >
                      {listing_contents}
                    </SolidLayout>
                  </Show>
                </Show>
              </>
            );
          },
        })}
      </Show>
      {desktop_filter_elements_()}
    </div>
  );
}
