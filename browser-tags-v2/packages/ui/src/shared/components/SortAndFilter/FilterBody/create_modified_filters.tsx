import { Accessor, createComputed, getOwner, Signal } from "solid-js";
import { HierarchicalValuesFilterMeta, SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { catchify, report } from "@depict-ai/utilishared";
import { lastHistoryDotStateToStateCleanupInfo } from "../../../helper_functions/history_dot_state_to_state";

// Exported from `@depict-ai/ui` and used by @depict-ai/portal-components
export function create_modified_filters({
  available_filters_,
  local_filter_cache_: [read_local_cache, write_local_cache],
  selected_filters_: [read_selected_filters],
}: {
  available_filters_: Accessor<SearchFilter[] | undefined>;
  selected_filters_: Signal<{ field: string; op: SearchFilter["op"]; data: any }[]>;
  local_filter_cache_: Signal<SearchFilter[]>;
}) {
  let last_remote_state: ReturnType<typeof available_filters_> | undefined;
  let executions = 0;
  let oneSecondInfiniteLoopPreventionTimeout: ReturnType<typeof setTimeout> | undefined;

  createComputed(() => {
    // Sometimes (24 events in sentry, https://depictai-0o.sentry.io/issues/?project=5476183&query=is%3Aunresolved+filters+failed&referrer=issue-list&statsPeriod=14d), for some inexplicable reason, this computation infinite loops
    // I spent a 1h17min debug session with MadePeople in a tab where they could reproduce
    // Observations were that of the signal read_local_cache the observers at some point randomly started having this computation first instead of the effect that writes the value to the history
    // It's VERY HARD to get a tab in a state where it can be reproduced, like with the exact same circumstances it happens "once a day" for them and there's no noticable pattern. But when a tab is found, it can be reliably reproduced by going backwards/forwards.
    // Also we reliably clean up and dispose of the search page and the effect of history_dot_state_to_state stays in the signals' observers, but for some reason it disappears when the bug happens (onCleanup doesn't get called then either, if I debugged that correctly)
    // As a value first workaround, we just recognise when the computation has been executed "too often" and just start not doing anything after that

    const remote_filters: Record<string, SearchFilter> = Object.fromEntries(
      available_filters_()?.map(
        filter => [JSON.stringify([filter.field, filter.op, filter?.meta?.type]), filter] as const
      ) || []
    );
    const local_filters: Record<string, SearchFilter> = Object.fromEntries(
      read_local_cache().map(filter => [JSON.stringify([filter.field, filter.op, filter?.meta?.type]), filter] as const)
    );
    const selected_filters: Record<string, { field: string; op: SearchFilter["op"]; data: any }> = Object.fromEntries(
      read_selected_filters().map(filter_obj => [JSON.stringify([filter_obj.field, filter_obj.op]), filter_obj])
    );
    const new_local_filter_state: SearchFilter[] = [];
    // we want to be as close as possible to available_filters_ in local_filters except that we want to keep values from previous available_filters_ as long as they're selected
    for (const filter_id of [
      ...Object.keys(local_filters).filter(key => !(key in remote_filters)),
      ...Object.keys(remote_filters),
    ]) {
      const local_filter = local_filters[filter_id];
      const remote_filter = remote_filters[filter_id];
      const filter_id_without_meta_type = JSON.stringify(
        (JSON.parse(filter_id) as [string, string, string | undefined]).slice(0, 2)
      );
      if (!remote_filter) {
        // check if this filter is selected, if it is just take the local one but set counts to 0 and remove non-selected options
        if (filter_id_without_meta_type in selected_filters) {
          new_local_filter_state.push(
            modify_only_local_filter(local_filter, selected_filters[filter_id_without_meta_type])
          );
        }
        // if it's not selected it's implicitly dropped here
      } else if (!local_filter) {
        // just take the remote one
        new_local_filter_state.push(remote_filter);
      } else {
        // both exist, merge them if needed
        const remote_meta = remote_filter.meta;
        const local_meta = local_filter.meta;
        const this_applied_filter = selected_filters[filter_id_without_meta_type];
        if (
          !remote_meta ||
          !local_meta ||
          !("values" in remote_meta) ||
          !("values" in local_meta) ||
          !Array.isArray(this_applied_filter?.data)
        ) {
          // can't or shouldn't be merged due to not being selected, just take remote one
          new_local_filter_state.push(remote_filter);
        } else {
          type MergeableFilterData = string | number | [number, number] | (string | number)[];
          type FilterDataByFilter = Record<
            string,
            { value_: MergeableFilterData; count_?: number; name_?: string; swatches_?: string[] }
          >;
          const data_objs_in_remote: FilterDataByFilter = Object.fromEntries(
            remote_meta.values.map((value: MergeableFilterData, index: number) => [
              JSON.stringify(value),
              {
                value_: value,
                count_: remote_meta.counts?.[index],
                name_: remote_meta.names?.[index],
                swatches_: (remote_meta as ValuesFilterMeta).swatches?.[index],
              },
            ])
          );
          const data_objs_in_local: FilterDataByFilter = Object.fromEntries(
            local_meta.values.map((value: MergeableFilterData, index: number) => [
              JSON.stringify(value),
              {
                value_: value,
                count_: 0,
                name_: local_meta.names?.[index],
                swatches_: (local_meta as ValuesFilterMeta).swatches?.[index],
              },
            ])
          );
          const new_data = [
            ...Object.keys(data_objs_in_local)
              .filter(key => {
                // put data entries that are selected and don't exist in new remote state first
                if (key in data_objs_in_remote) {
                  return false;
                }
                const selected_values = this_applied_filter.data as MergeableFilterData[];
                return selected_values.some(value => {
                  const is_equal = JSON.stringify(value) === key;
                  if (is_equal) {
                    return true;
                  }

                  if (local_meta.type === remote_meta.type && local_meta.type === "checkbox-hierarchical") {
                    // Very special case for hierarchical checkboxes - when a parent has all kids checked and a kid is deselected, the parent gets deselected. But since if it still has selected children we don't want to remove it from the filter state, even though it isn't selected, as the UI won't know the correct title of the parent category otherwise. This keeps it in that case.
                    const selected_values = data_objs_in_local[key].value_ as (string | number)[];
                    const values_length = (value as (string | number)[])?.length;
                    if (values_length > 1 && values_length - 1 === selected_values.length) {
                      let is_parent = true;
                      for (let i = 0; i < selected_values.length; i++) {
                        if (selected_values[i] !== (value as (string | number)[])[i]) {
                          is_parent = false;
                        }
                      }
                      return is_parent;
                    }
                  }
                  return false;
                });
              })
              .map(key => data_objs_in_local[key]),
            ...Object.values(data_objs_in_remote),
          ];
          const new_values = new_data.map(({ value_ }) => value_);
          const result = {
            ...remote_filter,
            meta: {
              ...remote_filter.meta,
              values: new_values,
              names: new_data.map(({ name_ }) => name_),
              counts: new_data.map(({ count_ }) => count_),
              ...("swatches" in remote_filter && { swatches: new_data.map(({ swatches_ }) => swatches_) }),
            } as ValuesFilterMeta | HierarchicalValuesFilterMeta,
          } as const;
          new_local_filter_state.push(result);
        }
      }
    }
    if (
      last_remote_state !== available_filters_() || // we HAVE to update the local filter state (it can contain same info but needs to be different object reference) every time the API state changes, otherwise the CheckboxHierarchicalFilter component doesn't update
      // Sorry……… They're not that big
      JSON.stringify(new_local_filter_state) !== JSON.stringify(read_local_cache())
    ) {
      const owner = getOwner();
      const signal = (owner as any)?.sources?.find?.(source => source.value === read_local_cache());
      if (executions > 50) {
        // We're probably in an infinite loop, let's just stop
        report(new Error("Infinite loop detected in create_modified_filters"), "error", {
          executions,
          new_local_filter_state,
          available_filters: available_filters_(),
          last_remote_state,
          history_length: history.length,
          location: location.href,
          foundSignal: !!signal,
          observerSlots: signal?.observerSlots,
          observers: signal?.observers?.map?.(o => o?.fn + ""),
          lastHistoryDotStateToStateCleanupInfo,
        });
        return;
      }

      write_local_cache(new_local_filter_state);

      // Keep track how many times we wrote this signal
      executions++;
      oneSecondInfiniteLoopPreventionTimeout ||= setTimeout(
        catchify(() => {
          executions = 0;
          oneSecondInfiniteLoopPreventionTimeout = undefined;
        }),
        1000
      );
    }
    last_remote_state = available_filters_();
  });
}

/**
 * When a filter is only available locally due to being selected in a previous navigation, we want to make that clear and prevent further "invalid" choices.
 * This sets the counts to 0 (if applicable) and removes non-selected options (if applicable)
 */
function modify_only_local_filter(
  local_filter_object: SearchFilter,
  selected_filter: { field: string; op: SearchFilter["op"]; data: any }
): SearchFilter {
  const old_meta = local_filter_object.meta;
  const selected_filter_data = selected_filter.data;
  const modified_filter_object = { ...local_filter_object };
  if (old_meta) {
    const new_meta = { ...old_meta } as typeof old_meta;
    modified_filter_object.meta = new_meta;
    // set counts to 0
    if ("counts" in new_meta) {
      const counts = new_meta.counts;
      if (counts) {
        new_meta.counts = counts.map(() => 0);
      }
    }
    if (Array.isArray(selected_filter_data) && "values" in new_meta) {
      // we have an array of values and want to strip the ones from the available ones that aren't selected
      const values = new_meta.values;
      if (Array.isArray(values)) {
        const jsond_set_values = selected_filter_data.map(data => JSON.stringify(data));
        const indexes_to_remove = new Set<number>();
        for (let i = 0; i < values.length; i++) {
          const value = values[i];
          if (!jsond_set_values.includes(JSON.stringify(value))) {
            // We want to remove the entry with this value from the filter object because it's not selected
            indexes_to_remove.add(i);
          }
        }
        new_meta.values = (values as any[]).filter((_, index) => !indexes_to_remove.has(index));
        if (new_meta.names) {
          new_meta.names = new_meta.names.filter((_, index) => !indexes_to_remove.has(index));
        }
        if ("swatches" in new_meta) {
          new_meta.swatches = new_meta.swatches?.filter((_, index) => !indexes_to_remove.has(index));
        }
        if (new_meta.counts) {
          // remove counts that are too much, they're all zero anyway if they exist
          new_meta.counts.length -= indexes_to_remove.size;
        }
      }
    }
  }

  return modified_filter_object;
}
