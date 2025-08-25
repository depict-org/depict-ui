/** @jsxImportSource solid-js */
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  Index,
  onCleanup,
  runWithOwner,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { HierarchicalValuesFilterMeta, SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchRequestV3";
import { SearchFilter as ResponseFilter } from "@depict-ai/types/api/SearchResponse";
import { catchify, observer } from "@depict-ai/utilishared";
import { useExpandingContainerReactive } from "../helper_functions/expanding_container_with_reactive_kids";
import { SolidFormatPrice } from "../helper_functions/solid_format_price";
import { solid_plp_shared_i18n } from "../../locales/i18n_types";
import { supports_partial_keyframes } from "./ExpandingDetails";
import { SlidableItems } from "./SlidableItems";
import { revertably_clear_filters } from "../helper_functions/revertably_clear_filters";
import { FilterWithData } from "../types";
import { CrossIcon } from "./icons/CrossIcon";
import { to_lower_case_if_possible } from "../helper_functions/to_lower_case_if_possible";

type hierarchical_data_structure = Record<
  string,
  {
    value_: string[];
    children_: Record<string, never> | hierarchical_data_structure;
    parent_: hierarchical_data_structure["string"] | Record<string, never>;
  }
>;

export function SelectedFilters({
  number_of_rendered_selected_filters_items_,
  i18n_,
  selected_filters_,
  local_filter_cache_: [read_local_filter_cache],
  get_search_filters_open_,
  get_search_sorting_open_,
  local_filter_cache_,
  expanded_hierarchical_filters_,
}: {
  get_search_filters_open_: Accessor<boolean>;
  get_search_sorting_open_: Accessor<boolean>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  number_of_rendered_selected_filters_items_: Signal<number>;
  i18n_: solid_plp_shared_i18n;
  selected_filters_: Signal<FilterWithData[]>;
  local_filter_cache_: Signal<SearchFilter[]>;
}) {
  const { price_formatting_ } = i18n_;
  const [read_selected_filters, write_selected_filters] = selected_filters_;
  const { collapse, expand, ExpandingContainer } = useExpandingContainerReactive({ duration: 200 });
  const owner = getOwner()!;

  const outmost_element = (
    <ExpandingContainer>
      <Show when={read_selected_filters().length}>
        <div class="inner">
          <span class="title">{i18n_.selected_filters_title_()}: </span>
          <SlidableItems slider_ref_={slider => (slider.container as HTMLDivElement).classList.add("filter-crumbs")}>
            <button
              class="clear-all-filters minor"
              onClick={catchify(() =>
                // click event handlers don't have an owner, carry it over
                runWithOwner(owner, () =>
                  revertably_clear_filters({
                    selected_filters_,
                    i18n_,
                    also_clear_sorting_: false,
                    user_triggered_: true,
                    expanded_hierarchical_filters_,
                    local_filter_cache_,
                  })
                )
              )}
            >
              {i18n_.clear_all_from_filter_crumbs_()}
            </button>
            <Index each={read_selected_filters()}>
              {(filter, index_in_selected_filters) => {
                const matching_filter = createMemo(() =>
                  read_local_filter_cache().find(hay => hay.field === filter().field && hay.op === filter().op)
                );
                const meta = createMemo(() => matching_filter()?.meta);
                const iterable_selected_filter_data = createMemo(() => {
                  const { data } = filter();
                  if (Array.isArray(data)) {
                    return data;
                  } else {
                    return [data];
                  }
                });
                const data_structure_if_hierarchical = createMemo(() => {
                  const m = meta();
                  if (m?.type !== "checkbox-hierarchical") {
                    return;
                  }
                  const { values } = m as HierarchicalValuesFilterMeta;
                  const data_structure: hierarchical_data_structure = {};
                  for (let i = 0; i < values.length; i++) {
                    const value = values[i] as unknown as (string | number)[];
                    let pointer = data_structure;
                    let parent_: Record<string, never> | hierarchical_data_structure[string] = {};
                    let created_an_object = false;
                    for (let j = 0; j < value.length; j++) {
                      const this_categories_name = to_lower_case_if_possible(value[j]);
                      const obj = (pointer[this_categories_name] ||= (() => {
                        const value_as_string = value.map(v => (typeof v === "number" ? v + "" : v)); // don't think backend will ever send numbers but technically it's allowed;
                        const created_obj: hierarchical_data_structure[string] = {
                          parent_,
                          value_: value_as_string,
                          children_: {},
                        };
                        parent_ = created_obj;
                        created_an_object = true;
                        return created_obj;
                      })());
                      pointer = obj.children_;
                      parent_ = obj;
                    }
                    if (!created_an_object && "value_" in parent_) {
                      // if an object was created for our "depth" in the hierarchy but not for our specific entry this means that the entry array was unsorted and looked something like
                      // [
                      //   ["Öl", "IPA"],
                      //   ["Öl", "Pale Ale"],
                      //   ["Öl", "Ale"],
                      //   ["Öl", "Mörk Lager"],
                      //   ["Öl", "Suröl"],
                      //   ["Öl", "Veteöl"],
                      //   ["Öl", "Stout och Porter"],
                      //   ["Öl"], // <- We are here, our `hierarchical_data_structure[string]`-object was created when we iterated over ["Öl", "IPA"]
                      //   ["Öl", "Ljus Lager"],
                      // ];
                      // In this case we want to just correct the name and value of the already created object, which will be in parent_
                      parent_.value_ = value.map(v => v + "");
                    }
                  }
                  return data_structure;
                });

                return (
                  <Show when={matching_filter()}>
                    <Show
                      when={matching_filter()?.op !== "inrange"}
                      fallback={(() => {
                        number_of_rendered_selected_filters_items_[1](prev => prev + 1);
                        onCleanup(() => number_of_rendered_selected_filters_items_[1](prev => prev - 1));
                        return (
                          <button
                            data-group-title={matching_filter()?.meta?.group_title}
                            class="clear-filter major"
                            onClick={() => {
                              const cloned_selected_filters = [...read_selected_filters()];
                              cloned_selected_filters.splice(index_in_selected_filters, 1);
                              write_selected_filters(cloned_selected_filters);
                            }}
                          >
                            <CrossIcon />
                            <span>
                              {price_formatting_().pre_}
                              <SolidFormatPrice
                                price_={(filter().data as [number, number])[0]}
                                price_formatting_={price_formatting_()}
                              />
                              {price_formatting_().post_} – {price_formatting_().pre_}
                              <SolidFormatPrice
                                price_={(filter().data as [number, number])[1]}
                                price_formatting_={price_formatting_()}
                              />
                              {price_formatting_().post_}
                            </span>
                          </button>
                        );
                      })()}
                    >
                      <Index each={iterable_selected_filter_data() as any[]}>
                        {(selected_data: Accessor<ReturnType<typeof iterable_selected_filter_data>[number]>) => {
                          const index_of_us_in_meta = createMemo(() => {
                            const sel_d = selected_data();
                            return (
                              meta() as ValuesFilterMeta | HierarchicalValuesFilterMeta | undefined
                            )?.values?.findIndex((value: ResponseFilter["data"]) => {
                              return (
                                to_lower_case_if_possible(value) === to_lower_case_if_possible(sel_d) ||
                                (Array.isArray(value) &&
                                  Array.isArray(sel_d) &&
                                  value.length === sel_d.length &&
                                  (value as any[]).every(
                                    (item, index) =>
                                      to_lower_case_if_possible(sel_d[index]) === to_lower_case_if_possible(item)
                                  ))
                              );
                            });
                          });
                          const name = createMemo(() => {
                            const index = index_of_us_in_meta();
                            if (index == undefined || index < 0) {
                              return;
                            }
                            return (
                              (meta() as ValuesFilterMeta | HierarchicalValuesFilterMeta | undefined)?.names?.[index] ||
                              (meta() as ValuesFilterMeta | HierarchicalValuesFilterMeta | undefined)?.values?.[index]
                            );
                          });
                          const us_in_structure = createMemo(() => {
                            const structure = data_structure_if_hierarchical();
                            if (!structure) {
                              return;
                            }
                            let we_in_structure: hierarchical_data_structure[string] | undefined;
                            let pointer: hierarchical_data_structure | Record<string, never> | undefined = structure;
                            for (const step of selected_data() as string) {
                              we_in_structure = (pointer as hierarchical_data_structure | undefined)?.[
                                to_lower_case_if_possible(step)
                              ];
                              pointer = we_in_structure?.children_;
                            }
                            return we_in_structure;
                          });
                          const hide_us = createMemo(() => {
                            // if all siblings checked, hide us
                            const parent = us_in_structure()?.parent_ as
                              | {
                                  value_: string[];
                                  children_?: hierarchical_data_structure;
                                  parent_: hierarchical_data_structure["string"] | Record<string, never>;
                                }
                              | undefined;
                            const siblings = parent?.children_;
                            if (siblings) {
                              return [parent, ...Object.values(siblings)].every(
                                ({ value_ }) =>
                                  iterable_selected_filter_data()?.some(
                                    (v: ReturnType<typeof iterable_selected_filter_data>[number]) =>
                                      Array.isArray(v) &&
                                      v.length === value_.length &&
                                      value_.every(
                                        (val, index) =>
                                          to_lower_case_if_possible(v[index]) === to_lower_case_if_possible(val)
                                      )
                                  )
                              );
                            }
                            return false;
                          });

                          return (
                            <Show when={name() && !hide_us()}>
                              {(() => {
                                number_of_rendered_selected_filters_items_[1](prev => prev + 1);
                                onCleanup(() => number_of_rendered_selected_filters_items_[1](prev => prev - 1));
                                return (
                                  <button
                                    class="clear-filter major"
                                    data-group-title={matching_filter()?.meta?.group_title}
                                    onClick={catchify(() => {
                                      const to_remove = selected_data();
                                      const cloned_selected_filters = [...read_selected_filters()];
                                      cloned_selected_filters.splice(index_in_selected_filters, 1);
                                      const data = filter().data;
                                      const cloned_data = Array.isArray(data) ? [...data] : [data];
                                      const index_of_item = cloned_data.findIndex(
                                        item => to_lower_case_if_possible(item) === to_lower_case_if_possible(to_remove)
                                      );
                                      if (index_of_item >= 0) {
                                        cloned_data.splice(index_of_item, 1);
                                      }
                                      const in_structure = us_in_structure();
                                      if (in_structure) {
                                        // also unselect potentially selected children
                                        const recursive_kids: hierarchical_data_structure[string][] = Object.values(
                                          in_structure.children_
                                        );
                                        while (recursive_kids.length) {
                                          const kid = recursive_kids.pop()!;
                                          const { value_ } = kid;
                                          const index_to_remove = cloned_data.findIndex(
                                            item =>
                                              Array.isArray(item) &&
                                              item.length === value_.length &&
                                              value_.every(
                                                (val, index) =>
                                                  to_lower_case_if_possible(item[index]) ===
                                                  to_lower_case_if_possible(val)
                                              )
                                          );
                                          if (index_to_remove >= 0) {
                                            cloned_data.splice(index_to_remove, 1);
                                          }
                                          recursive_kids.push(...Object.values(kid.children_));
                                        }
                                      }
                                      if (cloned_data.length) {
                                        const cloned_filter = {
                                          ...filter(),
                                          data: cloned_data,
                                        } as (typeof cloned_selected_filters)[number];
                                        cloned_selected_filters.push(cloned_filter);
                                      }
                                      write_selected_filters(cloned_selected_filters);
                                    })}
                                  >
                                    <CrossIcon />
                                    <span>{name()}</span>
                                  </button>
                                );
                              })()}
                            </Show>
                          );
                        }}
                      </Index>
                    </Show>
                  </Show>
                );
              }}
            </Index>
          </SlidableItems>
        </div>
      </Show>
    </ExpandingContainer>
  ) as HTMLDivElement;

  const [is_in_dom, set_is_in_dom] = createSignal(document.documentElement.contains(outmost_element));

  const hidden = createMemo(() => get_search_filters_open_() || get_search_sorting_open_());

  if (!untrack(is_in_dom)) {
    observer.wait_for_element(outmost_element).then(catchify(() => set_is_in_dom(true)));
  }

  outmost_element.classList.add("selected-filters");
  createEffect(
    catchify(async () => {
      if (!is_in_dom()) {
        // wait with setting state until we're in DOM, animation won't work otherwise
        return;
      }
      const is_small = window.matchMedia("(max-width:651px)").matches; // only animate on mobile where this could be feeling weird when something changes in the background, on desktop we want the instant snapping
      const duration = is_small ? undefined : supports_partial_keyframes() ? 0 : 1;
      /* we still need this component to render when it's hidden to update the "notification" on the filters button */
      if (hidden()) {
        await collapse(0, duration);
      } else {
        await expand(0, duration);
      }
    })
  );

  return outmost_element;
}
