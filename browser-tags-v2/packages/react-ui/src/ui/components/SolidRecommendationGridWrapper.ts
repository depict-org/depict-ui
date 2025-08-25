import { Display } from "@depict-ai/utilishared";
import {
  BaseProductListingConfig,
  defaultColsAtSize,
  defaultGridSpacing,
  RecommendationGrid as SDKRecommendationGrid,
} from "@depict-ai/ui";
import { render_display_or_block_from_react_template } from "../../helpers/render_display_or_block_from_react_template";
import { createElement, ReactPortal } from "react";
import { DepictProductCard } from "../../types";
import { isServer, ssr, ssrHydrationKey } from "solid-js/web";
import { renderToString } from "react-dom/server";

export interface RecommendationConfig<T extends Display> extends BaseProductListingConfig {
  /**
   * A promise containing the recommendations to render, see https://docs.depict.ai/api-guide/recommendations/api-client/fetching
   */
  recommendations: Promise<T[]>;
  /**
   * The product card function to use for rendering products.
   */
  productCard: DepictProductCard<T>;
  /**
   * Title to show when recommendations are being shown
   */
  title?: string;
}

export interface RecommendationGridConfig<T extends Display> extends RecommendationConfig<T> {
  maxRows?: number;
  viewMoreButton?: {
    text: string;
    startRows?: number;
    rowsPerClick?: number;
  };
}

export function SolidRecommendationGridWrapper<T extends Display>(
  props: RecommendationGridConfig<T>,
  set_portals: (portals: ReactPortal[]) => void
) {
  const component_portals = new Set<ReactPortal>();

  return SDKRecommendationGrid<T>({
    get recommendations() {
      return props.recommendations;
    },
    product_card_template: (display, info) => {
      if (isServer) {
        // This function can't be async on the server
        // @ts-ignore emulate the wrapper div that we need in prod here too for consistency
        const reactRetVal = renderToString(createElement(() => props.productCard({ display })));

        return ssr(["<div", ">", "</div>"], ssrHydrationKey(), reactRetVal) as any;
      }
      return render_display_or_block_from_react_template({
        component_props: { display },
        get_react_template: () => props.productCard,
        component_portals,
        set_portals,
        set_on_index_change_: info?.set_on_index_change,
      });
    },
    get cols_at_size() {
      return props.columnsAtSize || defaultColsAtSize;
    },
    get grid_spacing() {
      return props.gridSpacing ?? defaultGridSpacing;
    },
    get max_rows() {
      return props.maxRows;
    },
    get title() {
      return props.title;
    },
    get view_more_button() {
      const { viewMoreButton } = props;
      return viewMoreButton
        ? {
            text: viewMoreButton.text,
            start_rows: viewMoreButton.startRows ?? 2,
            rows_per_click: viewMoreButton.rowsPerClick,
          }
        : undefined;
    },
  });
}
