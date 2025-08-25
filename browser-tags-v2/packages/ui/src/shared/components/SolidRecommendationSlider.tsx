/** @jsxImportSource solid-js */
import { Accessor, createMemo, JSX as solid_JSX, Resource, Show, Suspense } from "solid-js";
import { Display, LayoutOptions, slider_fractional_factory } from "@depict-ai/utilishared";
import { create_cols_at_size_comment } from "../helper_functions/create_cols_at_size_comment";
import { ProductOrLookCardTemplate } from "../types";
import { Placeholders } from "../helper_functions/card_rendering/placeholder_rendering";
import { key_displays } from "../helper_functions/card_rendering/render_displays";
import { SolidLayoutWithProvidedElement } from "./SolidLayout";
import { SlidableItems } from "./SlidableItems";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";
import { renderDisplaysWithIntersectionObserver } from "../helper_functions/card_rendering/renderDisplaysWithIntersectionObserver";

/**
 * Render a slider with provided recommendations.
 */
export function SolidRecommendationSlider<T extends Display | FeaturedInDisplay>({
  recommendations_resource_,
  product_card_template_,
  layout_options_,
  title_,
  NoResultsFallback_,
  placeholderCacheKey_,
  showSliderArrow_,
}: {
  recommendations_resource_: Resource<T[]>;
  product_card_template_: ProductOrLookCardTemplate<T>;
  layout_options_: Accessor<Omit<LayoutOptions, "container_element" | "layout" | "rows">>;
  title_?: Accessor<solid_JSX.Element>;
  NoResultsFallback_?: () => solid_JSX.Element;
  placeholderCacheKey_?: symbol;
  showSliderArrow_?: Accessor<boolean | undefined>;
}) {
  const is_showing_something = createMemo(
    () => recommendations_resource_.loading || recommendations_resource_()?.length
  );
  const title = createMemo(() => title_?.()); // In case getter/accessor creates elements, don't create them twice

  const num_placeholders_ = () => 20;

  const slider = (
    <>
      <Show when={title()}>
        <h2 class="recs-title">{title()}</h2>
      </Show>
      <SlidableItems
        arrow_height_={25}
        arrow_width_={12.5}
        disable_fading_={true}
        showArrow_={showSliderArrow_?.()}
        slider_ref_={slider => {
          const { insert_here, container } = slider;
          const Layout = (props: Parameters<typeof SolidLayoutWithProvidedElement>[0]) =>
            SolidLayoutWithProvidedElement(props, insert_here as HTMLDivElement, true);
          // Do like this, so we don't have to call mergeProps ourselves
          <Layout rows="all" layout="slider" {...layout_options_()} />;

          slider_fractional_factory(0, 0.75).constructor_plugin.call(slider, {}); // enable fractional scrolling

          insert_here.before(create_cols_at_size_comment());
          container.classList.add("products");
        }}
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
      </SlidableItems>
    </>
  );

  return (
    <Show when={is_showing_something()} fallback={NoResultsFallback_?.()}>
      {slider}
    </Show>
  );
}
