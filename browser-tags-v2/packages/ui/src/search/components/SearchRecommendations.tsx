/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createMemo,
  createResource,
  createSignal,
  on,
  Show,
  Signal,
  Suspense,
  untrack,
} from "solid-js";
import { Display, LayoutOptions } from "@depict-ai/utilishared";
import { SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { DepictAPI } from "../../shared/DepictAPI";
import { solid_search_i18n } from "../../locales/i18n_types";
import { num_extra_placeholders } from "../../shared/helper_functions/magic_numbers";
import { create_cols_at_size_comment } from "../../shared/helper_functions/create_cols_at_size_comment";
import { FilterWithData, ProductCardTemplate } from "../../shared/types";
import { Placeholders } from "../../shared/helper_functions/card_rendering/placeholder_rendering";
import { key_displays, render_displays } from "../../shared/helper_functions/card_rendering/render_displays";
import { SolidLayout } from "../../shared/components/SolidLayout";
import { renderDisplaysWithIntersectionObserver } from "../../shared/helper_functions/card_rendering/renderDisplaysWithIntersectionObserver";

export const search_recommendation_start_rows = 2;

export function SearchRecommendations<T extends Display>({
  depict_api_,
  i18n_,
  search_query_base_,
  product_card_template_,
  showing_recommendation_rows_,
  layout_options_,
  all_products_loaded_,
}: {
  depict_api_: DepictAPI<T>;
  i18n_: solid_search_i18n;
  showing_recommendation_rows_: Signal<number>;
  product_card_template_: ProductCardTemplate<T>;
  layout_options_: Accessor<Omit<LayoutOptions, "container_element" | "layout" | "rows">>;
  all_products_loaded_: Accessor<boolean>;
  search_query_base_: Accessor<{
    sort?: SortModel;
    filters?: FilterWithData[];
    merchant: string;
    market: string;
    query: string;
    locale: string;
  }>;
}) {
  const [get_showing_recommendation_rows] = showing_recommendation_rows_; // We reset this in after_submit in search.tsx FYI
  const rows_object = make_state_saved_rows(showing_recommendation_rows_, i18n_);
  const [recommendations_resource] = createResource(
    () => all_products_loaded_() && search_query_base_(), // only fetch/refetch if all products are loaded
    query => query && depict_api_.get_recommended<T>(query).then(r => r.displays)
  );
  const should_show = createMemo<boolean>(
    () => !!((recommendations_resource.loading || recommendations_resource()?.length) && all_products_loaded_())
  ) as Accessor<boolean>;

  const num_placeholders_ = createMemo(() => {
    const possible_num_columns = layout_options_().cols_at_size.map(([per_column]) => per_column);
    if (!possible_num_columns.length) {
      // Empty cols_at_size, for example artilleriet has that
      // Assume there will be 4 columns
      possible_num_columns.push(4);
    }
    return num_extra_placeholders + get_showing_recommendation_rows() * Math.max(...possible_num_columns);
  });

  // Don't tear down elements every time one updates the page - don't put them within <Show>
  const elements = (
    <div class="search-recs">
      <h3 class="search-recs-title">{i18n_.search_recs_title_()}</h3>
      {create_cols_at_size_comment()}
      <SolidLayout rows={rows_object} layout="grid" element_attributes={{ class: "cards" }} {...layout_options_()}>
        <Suspense
          fallback={Placeholders({
            num_placeholders_,
            product_card_template_,
          })}
        >
          {(() => {
            // IIFE to make sure we access both the recommendations_resource and the resources containing the product card rendering results themselves within the Suspense boundary
            const displays_by_key_ = key_displays(
              createMemo<T[]>(prev => {
                if (!should_show() && prev) return prev; // When we're invisible, don't update what we're rendering to be possibly undefined to preserve the same products if possible
                return recommendations_resource() || [];
              })
            );

            const { renderedDisplays_ } = renderDisplaysWithIntersectionObserver({
              displays_by_key_,
              product_card_template_,
            });
            return renderedDisplays_;
          })()}
        </Suspense>
      </SolidLayout>
    </div>
  );

  return <Show when={should_show()}>{elements}</Show>;
}

function make_state_saved_rows(
  [get_showing_recommendation_rows, set_showing_recommendation_rows]: Signal<number>,
  i18n_: solid_search_i18n
) {
  const currently_visible = createSignal(untrack(get_showing_recommendation_rows));
  const [get_currently_visible, set_currently_visible] = currently_visible;
  const rows: Parameters<typeof SolidLayout>[0]["rows"] = {
    currently_visible,
    start_rows: search_recommendation_start_rows,
    rows_per_click: 3,
    button: (
      <button class="show-more major" type="button">
        {i18n_.view_more_()}
      </button>
    ) as HTMLButtonElement,
  };

  createComputed(
    on(get_currently_visible, new_visible => set_showing_recommendation_rows(new_visible), { defer: true })
  );

  createComputed(
    on(
      get_showing_recommendation_rows,
      (new_rows = search_recommendation_start_rows) => set_currently_visible(new_rows),
      { defer: true }
    )
  );

  return rows;
}
