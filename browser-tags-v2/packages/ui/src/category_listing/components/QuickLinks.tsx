/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  getOwner,
  Index,
  on,
  runWithOwner,
  untrack,
} from "solid-js";
import { catchify, observer, report } from "@depict-ai/utilishared";
import { SlidableItems } from "../../shared/components/SlidableItems";
import { solid_category_i18n } from "../../locales/i18n_types";
import { transfer_encoded_sort_and_filter } from "../../shared/url_state/encoding";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import { TextPlaceholder } from "../../shared/components/Placeholders/TextPlaceholder";
import { ProductListingWithPageURL } from "../types";
import * as IdTypes from "../IdTypes";
import { allowNativeNavigation } from "../../shared/helper_functions/allowNativeNavigation";

export function QuickLinks({
  quicklinks_data_,
  router_,
  id_to_query_for_,
  breadcrumb_data_,
  i18n_,
  sorting_query_param_,
  filter_query_param_prefix_,
  id_type_,
}: {
  quicklinks_data_: Accessor<ProductListingWithPageURL[] | undefined>;
  router_: PseudoRouter;
  id_to_query_for_: Accessor<string>;
  breadcrumb_data_: Accessor<ProductListingWithPageURL[] | undefined>;
  i18n_: solid_category_i18n;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
  id_type_: Accessor<IdTypes.IdType>;
}) {
  let scrolling_logic_ran_for_listing_id = false;
  let last_scroll_position: number | undefined;
  let scroll_to_element_on_dom_insertion: number | undefined;
  let last_was_placeholder = false;
  let sliding_element: HTMLDivElement | undefined;
  createComputed(() => {
    id_to_query_for_();
    scrolling_logic_ran_for_listing_id = false;
  });
  const place_holdey_quicklinks_data = createMemo(() => quicklinks_data_() || [, , ,]);
  const selected_index = createMemo(
    () =>
      quicklinks_data_()?.findIndex(
        item => item[id_type_() === IdTypes.EXTERNAL_ID ? "external_id" : "listing_id"] === id_to_query_for_()
      )
  ); // this will be -1 when viewing child categories
  const scrollpos_per_listing_id: Record<string, number> = {};
  const mutation_plugins = [
    function () {
      if (!scrolling_logic_ran_for_listing_id) {
        return;
      }
      const { scrollLeft } = this.insert_here as HTMLDivElement;
      if (scrollLeft > 0) {
        last_scroll_position = scrollLeft;
        const current_id = untrack(id_to_query_for_);
        // make sure to not save position where selected item isn't in viewport
        const current_selected_index = untrack(selected_index);
        const intersecting_thing = this.intersecting_items_object[current_selected_index!];
        if (
          intersecting_thing?.intersectionRatio >= 0.95 ||
          current_selected_index == undefined ||
          current_selected_index < 0
        ) {
          scrollpos_per_listing_id[current_id] = scrollLeft;
        } else if (current_id in scrollpos_per_listing_id) {
          // if about to go out of view, stop saving it so that the "always show new things in view" thing can get to work
          delete scrollpos_per_listing_id[current_id];
        }
      }
    },
  ] as Parameters<typeof SlidableItems>[0]["mutation_plugins_"];

  createComputed(() => {
    if (place_holdey_quicklinks_data()?.[0]?.listing_id) {
      if (last_was_placeholder) {
        queueMicrotask(
          catchify(() => {
            sliding_element?.scrollTo({ left: 0 }); // for some reason we land one element to the right after placeholder rendering otherwise
          })
        );
      }
      last_was_placeholder = false;
    } else {
      last_was_placeholder = true;
    }
  });
  const [in_out_dom, set_in_out_dom] = createSignal(false);

  return (
    <ErrorBoundary
      fallback={err => {
        const msg = "QuickLinks failed";
        report([err, msg], "error");
        return <div>{msg}</div>;
      }}
    >
      <nav class="quicklinks" aria-label={i18n_.quicklinks_aria_label_()}>
        <SlidableItems
          faded_opacity_={0.5}
          mutation_plugins_={mutation_plugins}
          slider_ref_={slider => {
            const { insert_here, intersecting_items_object } = slider;
            sliding_element = insert_here as HTMLDivElement;
            observer.onexists(insert_here as HTMLDivElement, ({ element }) => {
              if (scroll_to_element_on_dom_insertion == undefined) {
                if (!element.scrollLeft) {
                  const target_position = last_scroll_position;
                  if (target_position) {
                    element.scrollTo({ left: target_position });
                  } else {
                    // run scrolling logic, it might not have run because we went to another page and then back so breadcrumb_data_ is the same
                    set_in_out_dom(prev => !prev);
                  }
                }
              } else {
                slider.scroll_to_abs(scroll_to_element_on_dom_insertion, true);
                last_scroll_position = (insert_here as HTMLDivElement).scrollLeft; // update this because it might get removed from the DOM before intersection observers triggered (actually happened for me)
                scroll_to_element_on_dom_insertion = undefined;
              }
            });
            createEffect(
              on(
                createMemo(
                  () => {
                    in_out_dom();
                    return breadcrumb_data_();
                  },
                  undefined,
                  { equals: false }
                ),
                new_data => {
                  const quicklinks_data = quicklinks_data_(); // this signal should have updated by now since this is a createEffect
                  const current_id = id_to_query_for_();
                  if (!new_data || !quicklinks_data || !current_id) {
                    return;
                  }
                  const owner = getOwner()!;
                  queueMicrotask(() => {
                    // has to be in microtask so that elements have rendered and are scroll-to-able
                    scrolling_logic_ran_for_listing_id = true;
                    const saved_scroll_position = scrollpos_per_listing_id[current_id];
                    if (saved_scroll_position) {
                      (insert_here as HTMLDivElement).scrollTo({ left: saved_scroll_position });
                      last_scroll_position = saved_scroll_position;
                    } else if (!(intersecting_items_object[selected_index()!]?.intersectionRatio >= 0.95)) {
                      // negated larger than to handle left side of comparison being undefined
                      let done_work = false;
                      runWithOwner(owner, () =>
                        createComputed(
                          catchify(() => {
                            if (done_work || !Array.isArray(quicklinks_data_())) {
                              return;
                            }
                            const sel_index = selected_index();
                            const target_element = sel_index! >= 0 ? sel_index! : 0;
                            if (document.documentElement.contains(insert_here as HTMLDivElement)) {
                              slider.scroll_to_abs(target_element, true); // if nothing selected and no selected scroll position, go to left
                              last_scroll_position = (insert_here as HTMLDivElement).scrollLeft; // update this because it might get removed from the DOM before intersection observers triggered (actually happened for me)
                            } else {
                              // can't scroll if not in the DOM, scroll when we're back instead
                              scroll_to_element_on_dom_insertion = target_element;
                            }
                            done_work = true;
                          })
                        )
                      );
                    }
                  });
                },
                { defer: true }
              )
            );
          }}
        >
          <Index each={place_holdey_quicklinks_data()}>
            {(display_accessor, index) => {
              const is_selected = createMemo(() => selected_index() === index);
              // Problem: if opening a sibling link in a new tab, filter clearing behavior is no longer consistent
              // Solution:
              // If id of current category is in quick links they're siblings, don't add state to the url
              // If it's not in it, it's a child of the current one, so add state
              // (This brought up the issue on what happens if someone links to a filter that no longer exists, I chose to ignore that for now)
              // Problem: When you don't open a link in a new tab, we don't display the filter cleared toast
              // Solution: instead of not adding the state to the url, add a flag to the link if it's a sibling and then display the toast on load if the flag is set

              const is_sibling = createMemo(() => {
                const current_id = id_to_query_for_();
                const lookForId = id_type_() === IdTypes.EXTERNAL_ID ? "external_id" : "listing_id";
                return quicklinks_data_()?.some(quickLink => quickLink[lookForId] === current_id);
              });

              const href = createMemo(() =>
                // We don't want these links to delete the sort and filter state by default, only if `clear_filters_when_going_sideways` explicitly clears them
                transfer_encoded_sort_and_filter({
                  to_url_: display_accessor()?.page_url,
                  set_clearing_flag_: is_sibling(),
                  sorting_query_param_,
                  filter_query_param_prefix_,
                })
              );

              return (
                <>
                  <a
                    class="quicklink"
                    classList={{
                      selected: is_selected(),
                    }}
                    href={href()}
                    onClick={catchify((ev: MouseEvent) => {
                      const url = href();
                      if ((is_selected() && !allowNativeNavigation(ev)) || !url) {
                        // allow open currently selected one in new tab but otherwise prevent clicks
                        ev.preventDefault();
                      } else if (url) {
                        router_.navigate_.go_to_({
                          new_url_: url,
                          is_replace_: false,
                          event_: ev,
                          force_spa_navigation_: true,
                          listing_query_: { id: display_accessor()!.listing_id, type: IdTypes.LISTING_ID },
                        });
                      }
                    })}
                  >
                    {display_accessor()?.title || <TextPlaceholder height="1em" width="10ch" />}
                  </a>
                </>
              );
            }}
          </Index>
        </SlidableItems>
      </nav>
    </ErrorBoundary>
  );
}
