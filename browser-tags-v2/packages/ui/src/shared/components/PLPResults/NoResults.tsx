/** @jsxImportSource solid-js */
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { Accessor, getOwner, runWithOwner, Show, Signal } from "solid-js";
import { revertably_clear_filters } from "../../helper_functions/revertably_clear_filters";
import { SearchFilter } from "@depict-ai/types/api/SearchRequestV3";
import { SearchFilter as CategoryFilter } from "@depict-ai/types/api/ProductListingResponseV3";
import { catchify } from "@depict-ai/utilishared";
import { FilterWithData } from "../../types";

export function NoResults({
  i18n_,
  expanded_hierarchical_filters_,
  selected_filters_,
  local_filter_cache_,
}: {
  i18n_: solid_plp_shared_i18n & {
    no_results_text_: Accessor<string>;
  };
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  selected_filters_: Signal<FilterWithData[]>;
  local_filter_cache_: Signal<(SearchFilter | CategoryFilter)[]>;
}) {
  const root = getOwner()!;

  return [
    (
      <div class="no-results">
        <div class="text">{i18n_.no_results_text_()}</div>
        <Show when={Object.values(selected_filters_[0]()).length}>
          <a
            class="hint"
            onClick={catchify(() =>
              runWithOwner(root, () =>
                revertably_clear_filters({
                  user_triggered_: true,
                  selected_filters_,
                  also_clear_sorting_: false,
                  expanded_hierarchical_filters_,
                  i18n_,
                  local_filter_cache_,
                })
              )
            )}
            href="javascript:void(0)"
          >
            {i18n_.try_without_filters_()}
          </a>
        </Show>
      </div>
    ) as HTMLDivElement,
  ];
}
