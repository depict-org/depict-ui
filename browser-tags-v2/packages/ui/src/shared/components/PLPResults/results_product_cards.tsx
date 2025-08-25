/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  JSX as solid_JSX,
  Resource,
  Setter,
  Signal,
} from "solid-js";
import { DepictAPI } from "../../DepictAPI";
import { Display } from "@depict-ai/utilishared";
import { ProductListingResponseV3 } from "@depict-ai/types/api/ProductListingResponseV3";
import { load_more_if_needed } from "./load_more_if_needed";
import { calculate_percentage_in_view } from "./calculate_percentage_in_view";
import { key_displays } from "../../helper_functions/card_rendering/render_displays";
import { BaseQueryAccessor, ProductCardTemplate } from "../../types";
import { SearchResponseAfterDisplayTransformer } from "../../../search/types";
import { renderDisplaysWithIntersectionObserver } from "../../helper_functions/card_rendering/renderDisplaysWithIntersectionObserver";

export function ResultsProductCards<T extends Display>({
  plp_results_,
  product_card_template_,
  first_result_in_viewport_: [, setFirstResultInViewport],
  last_result_in_viewport_: [lastResultInViewport, setLastResultsInViewport],
  all_products_loaded_,
  min_products_to_fetch_,
  query_base_,
  depict_api_,
  is_loading_,
  content_blocks_,
  setCurrentlyLoadedDisplays_,
  isSliderLayout_,
}: {
  plp_results_: Resource<SearchResponseAfterDisplayTransformer | ProductListingResponseV3 | undefined>;
  product_card_template_: ProductCardTemplate<T>;
  first_result_in_viewport_: Signal<number | undefined>;
  last_result_in_viewport_: Signal<number | undefined>;
  all_products_loaded_: Signal<boolean>;
  min_products_to_fetch_: number;
  query_base_: BaseQueryAccessor;
  depict_api_: DepictAPI<T>;
  is_loading_: Accessor<boolean>;
  setCurrentlyLoadedDisplays_: Setter<number>;
  content_blocks_?: Accessor<Accessor<((() => solid_JSX.Element) | (() => solid_JSX.Element)[])[]>>;
  isSliderLayout_: Accessor<boolean>;
}) {
  // Although typing doesn't reflect it, plp_results is guaranteed to contain an array of at least one display at this point
  const [get_extra_displays, set_extra_displays_] = createSignal<T[]>([], { equals: false });

  const displays_by_key_ = key_displays(
    createMemo(() => [...((plp_results_()?.displays || []) as T[]), ...get_extra_displays()])
  );

  const { indexToTargetMap_, renderedDisplays_, currentlyIntersecting } = renderDisplaysWithIntersectionObserver({
    displays_by_key_,
    product_card_template_,
    content_blocks_,
    alwaysObserveCards_: true,
  });

  const percentage_in_view_ = calculate_percentage_in_view({
    get_last_result_in_viewport_: lastResultInViewport,
    displays_by_key_,
    index_to_target_map_: indexToTargetMap_,
    is_loading_,
    get_extra_displays,
    isSliderLayout_,
  });

  createComputed(() => setCurrentlyLoadedDisplays_(displays_by_key_().size));

  load_more_if_needed({
    percentage_in_view_,
    set_extra_displays_,
    all_products_loaded_,
    plp_results_,
    min_products_to_fetch_,
    query_base_,
    depict_api_,
  });

  createEffect(() => {
    const intersecting = currentlyIntersecting();
    setFirstResultInViewport(Math.min(...intersecting) + 1); // +1 because we want to start counting at 1
    setLastResultsInViewport(Math.max(...intersecting) + 1);
  });

  return renderedDisplays_;
}
