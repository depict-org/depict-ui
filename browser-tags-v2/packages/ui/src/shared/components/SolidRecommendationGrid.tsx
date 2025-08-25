/** @jsxImportSource solid-js */
import { Accessor, createMemo, JSX as solid_JSX, Resource, Show, Suspense } from "solid-js";
import { Display, LayoutOptions } from "@depict-ai/utilishared";
import { create_cols_at_size_comment } from "../helper_functions/create_cols_at_size_comment";
import { ProductOrLookCardTemplate } from "../types";
import { Placeholders } from "../helper_functions/card_rendering/placeholder_rendering";
import { key_displays, render_displays } from "../helper_functions/card_rendering/render_displays";
import { SolidLayout } from "./SolidLayout";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";
import { renderDisplaysWithIntersectionObserver } from "../helper_functions/card_rendering/renderDisplaysWithIntersectionObserver";

/**
 * Render a grid with provided recommendations.
 */
export function SolidRecommendationGrid<T extends Display | FeaturedInDisplay>({
  recommendations_resource_,
  product_card_template_,
  layout_options_,
  title_,
  max_rows_,
  view_more_button_,
  NoResultsFallback_,
  placeholderCacheKey_,
}: {
  recommendations_resource_: Resource<T[]>;
  product_card_template_: ProductOrLookCardTemplate<T>;
  layout_options_: Accessor<Omit<LayoutOptions, "container_element" | "layout" | "rows">>;
  NoResultsFallback_?: () => solid_JSX.Element;
  view_more_button_?: Accessor<
    | undefined
    | {
        text: string;
        start_rows?: number;
        rows_per_click?: number;
      }
  >;
  max_rows_?: Accessor<undefined | number>;
  title_?: Accessor<solid_JSX.Element> | undefined;
  placeholderCacheKey_?: symbol;
}) {
  const rows_object_ = createMemo(() => {
    const view_more_button = view_more_button_?.();
    const max_rows = max_rows_?.();
    if (!view_more_button) {
      if (max_rows) {
        return { max_rows };
      }
      return "all";
    }

    return {
      max_rows,
      start_rows: view_more_button.start_rows,
      rows_per_click: view_more_button.rows_per_click ?? 2,
      button: (
        <button class="show-more major" type="button">
          {view_more_button.text}
        </button>
      ) as HTMLButtonElement,
    };
  });
  const is_showing_something = createMemo(
    () => recommendations_resource_.loading || recommendations_resource_()?.length
  );
  const title = createMemo(() => title_?.()); // In case getter/accessor creates elements, don't create them twice

  const num_placeholders_ = () => 20;
  const elements = // Don't tear down elements every time one updates the page - don't put them within <Show>
    (
      <>
        <Show when={title()}>
          <h2 class="recs-title">{title()}</h2>
        </Show>
        <div class="recommendation-grid">
          {create_cols_at_size_comment()}
          <SolidLayout
            rows={rows_object_()}
            layout="grid"
            element_attributes={{ class: "cards" }}
            {...layout_options_()}
          >
            <Suspense
              fallback={Placeholders({
                num_placeholders_,
                product_card_template_,
                placeholderCacheKey_,
              })}
            >
              {(() => {
                // IIFE to make sure we access both the recommendations_resource and the resources containing the product card rendering results themselves within the Suspense boundary
                const displays_by_key_ = key_displays(createMemo(() => recommendations_resource_() || []));
                const { renderedDisplays_ } = renderDisplaysWithIntersectionObserver({
                  displays_by_key_,
                  product_card_template_,
                });
                return renderedDisplays_;
              })()}
            </Suspense>
          </SolidLayout>
        </div>
      </>
    );

  return (
    <Show when={is_showing_something()} fallback={NoResultsFallback_?.()}>
      {elements}
    </Show>
  );
}
