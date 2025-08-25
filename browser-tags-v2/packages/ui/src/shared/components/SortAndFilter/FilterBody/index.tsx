/** @jsxImportSource solid-js */
import { Accessor, createMemo, createSignal, For, Index, JSX as solid_JSX, Show, Signal } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { SearchFilter } from "@depict-ai/types/api/SearchResponse";
import filter_components from "../filter_components";
import { ExpandingDetails } from "../../ExpandingDetails";
import { MorphingSign } from "../../MorphingSign";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { SelectedSummary } from "./SelectedSummary";
import { make_is_open_signal } from "./make_is_actually_open_signal";
import { WithRequired } from "../../../types";
import { SentryErrorBoundary } from "../../SentryErrorBoundary";
import { revertably_clear_filters } from "../../../helper_functions/revertably_clear_filters";
import { Dynamic } from "solid-js/web";
import { TextPlaceholder } from "../../Placeholders/TextPlaceholder";
import { CrossIcon } from "../../icons/CrossIcon";
import { use_search_in_filter } from "./use_search_in_filter";
import { make_accurate_width_accessor } from "../../../helper_functions/make_accurate_width_accessor";

interface FilterBodyProps {
  available_filters_: Accessor<SearchFilter[] | undefined>;
  expanded_filters_: Signal<{ section_: string; expanded_: boolean }[]>;
  selected_filters_: Signal<{ field: string; op: SearchFilter["op"]; data: any }[]>;
  local_filter_cache_: Signal<SearchFilter[]>;
  i18n_: solid_plp_shared_i18n;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  are_in_modal_?: boolean;
  hideCount0FilterOptions_: Accessor<boolean>;
}

// Exported from `@depict-ai/ui` and used by @depict-ai/portal-components
export function FilterBody(props: FilterBodyProps) {
  // Split like this to make placeholder wrapping more visible & this component is exported and used in MobileModal
  return (
    <Show
      // When we have an empty array, don't show placeholders. When filters are undefined it means they haven't loaded yet - show placeholders
      when={props.available_filters_()}
      fallback={Array.from({ length: 5 }).map(() => (
        <div class="filter-collapsible">
          <TextPlaceholder width="100%" height="50px" />
        </div>
      ))}
    >
      <ActualFilterBody {...props} />
    </Show>
  );
}

function ActualFilterBody(props: FilterBodyProps) {
  const [modified_available_filters_with_selected_unexisting_ones_injected_from_local_state] =
    props.local_filter_cache_;
  const withMaybeCount0Removed = createMemo(() => {
    const filters = modified_available_filters_with_selected_unexisting_ones_injected_from_local_state();
    if (!props.hideCount0FilterOptions_()) {
      return filters;
    }
    return filters.map(filter => {
      const oldMeta = filter.meta;
      if (!oldMeta) return filter;
      const modifiedMeta = { ...oldMeta };
      if ("counts" in modifiedMeta) {
        // Remove all count 0 filter options, important that counts is last option
        for (const key of ["names", "values", "swatches", "counts"] as const) {
          modifiedMeta[key] &&= modifiedMeta[key].filter((_, index) => modifiedMeta.counts[index] !== 0);
        }
      }
      return { ...filter, meta: modifiedMeta };
    });
  });
  const togglable_filters = createMemo(
    () =>
      withMaybeCount0Removed().filter(
        item => item?.meta?.group_title
      ) as /* sometimes TS really is unintuitive, if item?.meta?.group_title has to be truthy neither meta nor group_title can be undefined */ (Exclude<
        SearchFilter,
        "meta"
      > &
        Exclude<WithRequired<SearchFilter, "meta">, "group_title"> & {
          meta: { group_title: WithRequired<WithRequired<SearchFilter, "meta">["meta"], "group_title">["group_title"] };
        })[]
  );

  const untogglable_filters = createMemo(() => withMaybeCount0Removed().filter(item => !item?.meta?.group_title));
  const togglable_filters_grouped_by_collapsible = createMemo(() => {
    const output: { [key: string]: SearchFilter[] } = {};
    for (const filter of togglable_filters()) {
      const title = filter.meta.group_title;
      const our_array = (output[title!] ||= [] as SearchFilter[]);
      our_array.push(filter);
    }
    return output;
  });
  return [
    <For each={Object.keys(togglable_filters_grouped_by_collapsible())}>
      {(section_, get_section_index) => {
        return (
          // work around <For> quirkiness
          <Show when={togglable_filters_grouped_by_collapsible()[section_]}>
            {(() => {
              const filter_array_ = createMemo(
                () => Object.values(togglable_filters_grouped_by_collapsible())[get_section_index()]
              );
              const { SearchThisFilterGroup_, searched_filter_array_, filter_query_ } = use_search_in_filter(
                filter_array_,
                section_,
                props.i18n_
              );

              const is_open = make_is_open_signal({
                get expanded_filters_() {
                  return props.expanded_filters_;
                },
                section_: section_,
                filter_array_: filter_array_,
              });
              const view_more_button_below_group = createSignal<solid_JSX.Element>();
              const selected_filters_in_group = createMemo(
                () =>
                  new Map(
                    filter_array_()
                      .map(
                        filter_from_api =>
                          [
                            props.selected_filters_[0]().find(
                              filter => filter.op === filter_from_api.op && filter.field === filter_from_api.field
                            )!, // this is absolutely not accurate which is why we have the .filter below, it's just the easiest way to get the typing of the map correct
                            filter_from_api,
                          ] as const
                      )
                      .filter(([selected_filter]) => selected_filter)
                  )
              );
              const a_filter_is_selected = createMemo(() => selected_filters_in_group().size);
              const [get_details_width, set_get_details_width] = createSignal<
                Accessor<number | undefined> | undefined
              >();
              const details_element_width_ = createMemo(() => get_details_width?.()?.());

              return (
                <ExpandingDetails
                  is_open_={is_open}
                  details_={
                    (
                      <details
                        class="filter-collapsible"
                        data-group-title={section_}
                        ref={element => set_get_details_width(() => make_accurate_width_accessor(element))}
                      />
                    ) as HTMLDetailsElement
                  }
                  summary_={
                    (
                      <summary class="filter-group-summary">
                        <div class="summary">
                          {/* workaround https://github.com/philipwalton/flexbugs#flexbug-9 */}
                          <span>{section_}</span>
                          <div class="selected-w-sign">
                            <Show when={a_filter_is_selected()}>
                              <SelectedSummary
                                selected_filters_in_group_={selected_filters_in_group}
                                i18n_={props.i18n_}
                              />
                            </Show>
                            <MorphingSign expanded_={is_open[0]} i18n_={props.i18n_} />
                          </div>
                        </div>
                      </summary>
                    ) as HTMLElement
                  }
                >
                  <div class="filter-collapsible-body">
                    <div class="filter-part">
                      <SearchThisFilterGroup_ />
                      <Index each={searched_filter_array_()}>
                        {filter => (
                          <SentryErrorBoundary
                            severity_="error"
                            message_={"Filter group " + JSON.stringify(section_) + " failed"}
                          >
                            <Dynamic
                              component={
                                filter_components[
                                  filter()?.meta?.type as keyof typeof filter_components
                                ] as (typeof filter_components)[keyof typeof filter_components]
                              }
                              filter_={filter}
                              expanded_hierarchical_filters_={props.expanded_hierarchical_filters_}
                              selected_filters_={props.selected_filters_ as unknown as Signal<SearchFilter[]>}
                              i18n_={props.i18n_}
                              view_more_button_below_group_={view_more_button_below_group}
                              filter_query_={filter_query_}
                              details_element_width_={details_element_width_}
                            />
                          </SentryErrorBoundary>
                        )}
                      </Index>
                    </div>
                    <Show
                      when={createMemo(() => {
                        const signal_value = view_more_button_below_group[0]();
                        return (
                          (signal_value && Array.isArray(signal_value) ? signal_value.length : signal_value) ||
                          a_filter_is_selected()
                        );
                      })()}
                    >
                      <div class="view-more-clear">
                        {view_more_button_below_group[0]()}
                        <Show when={a_filter_is_selected()}>
                          <button
                            class="clear-group"
                            onClick={catchify(() => {
                              const new_filter_obj = [...props.selected_filters_[0]()];
                              for (const filter of filter_array_()) {
                                const index = new_filter_obj.findIndex(
                                  ({ op, field }) => op === filter.op && field === filter.field
                                );
                                if (index >= 0) {
                                  new_filter_obj.splice(index, 1);
                                }
                              }
                              props.selected_filters_[1](new_filter_obj);
                            })}
                          >
                            <CrossIcon />
                            <span>{props.i18n_.clear_individual_filter_()}</span>
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                </ExpandingDetails>
              );
            })()}
          </Show>
        );
      }}
    </For>,
    <Show when={untogglable_filters()?.length}>
      <div class="ungrouped">
        <Index each={untogglable_filters()}>
          {filter => {
            const view_more_button_below_group = createSignal<solid_JSX.Element>();
            const [get_view_more_button_below_group] = view_more_button_below_group;

            return (
              <>
                <Dynamic
                  component={
                    filter_components[
                      filter()?.meta?.type as keyof typeof filter_components
                    ] as (typeof filter_components)[keyof typeof filter_components]
                  }
                  filter_={filter}
                  expanded_hierarchical_filters_={props.expanded_hierarchical_filters_}
                  selected_filters_={props.selected_filters_ as unknown as Signal<SearchFilter[]>}
                  i18n_={props.i18n_}
                  view_more_button_below_group_={view_more_button_below_group}
                />
                {get_view_more_button_below_group()}
              </>
            );
          }}
        </Index>
      </div>
    </Show>,
    <Show when={!props.are_in_modal_ /* modal has its own clear button */ && props.selected_filters_[0]()?.length}>
      <button
        class="clear-all-filters major"
        onClick={catchify(() =>
          revertably_clear_filters({
            user_triggered_: true,
            selected_filters_: props.selected_filters_,
            i18n_: props.i18n_,
            also_clear_sorting_: false,
            expanded_hierarchical_filters_: props.expanded_hierarchical_filters_,
            local_filter_cache_: props.local_filter_cache_,
          })
        )}
      >
        {props.i18n_.clear_all_filters_from_big_button_()}
      </button>
    </Show>,
  ];
}
