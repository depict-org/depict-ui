import { wrap_solid_in_react } from "../../util";
import {
  defaultColsAtSize,
  defaultGridSpacing,
  LooksSliderOrGrid as SDKLooksSliderOrGrid,
  SDKColsAtSize,
  SDKGridSpacing,
} from "@depict-ai/ui";
import { globalState } from "../../global_state";
import { SolidShowComponentAfterStateSet } from "../../helpers/SolidShowComponentAfterStateSet";

/**
 * Renders a grid or slider containing look cards for the looks available for a certain product (provided productId).
 */
export function LooksSliderOrGrid(props: Parameters<typeof SolidLooksWrapper>[0]) {
  return wrap_solid_in_react({
    solid_component: props => (
      <SolidShowComponentAfterStateSet>
        <SolidLooksWrapper {...props} />
      </SolidShowComponentAfterStateSet>
    ),
    props,
  });
}

export function SolidLooksWrapper(props: {
  gridSpacing?: SDKGridSpacing;
  columnsAtSize?: SDKColsAtSize;
  productId: string;
  imagePlaceholderAspectRatio?: number | string;
  title?: string;
  className?: string;
  /**
   * If provided, will render as grid instead of slider
   */
  gridOptions?: {
    maxRows?: number;
    viewMoreButton?: {
      text: string;
      startRows?: number;
      rowsPerClick?: number;
    };
  };
}) {
  const {
    merchant: [merchant],
    market: [market],
    usedLocale: [locale],
    on_navigation,
  } = globalState;

  return SDKLooksSliderOrGrid({
    get gridSpacing_() {
      return props.gridSpacing ?? defaultGridSpacing;
    },
    get columnsAtSize_() {
      return props.columnsAtSize ?? defaultColsAtSize;
    },
    get productId_() {
      return props.productId;
    },
    get imagePlaceholderAspectRatio_() {
      return props.imagePlaceholderAspectRatio ?? 0.75;
    },
    get title_() {
      return props.title;
    },
    get class_() {
      return props.className;
    },
    get merchant_() {
      return merchant()!;
    },
    get market_() {
      return market()!;
    },
    get priceFormatting_() {
      return locale().price_formatting_;
    },
    get locale_() {
      return locale().backend_locale_;
    },
    get onNavigation_() {
      return on_navigation;
    },
    get gridOptions_() {
      const { gridOptions } = props;
      const view_more_button = gridOptions?.viewMoreButton;
      return (
        gridOptions && {
          max_rows: gridOptions.maxRows,
          view_more_button: view_more_button && {
            text: view_more_button.text,
            start_rows: view_more_button.startRows ?? 2,
            rows_per_click: view_more_button.rowsPerClick,
          },
        }
      );
    },
    get displayTransformers_() {
      return globalState.api?.display_transformers;
    },
  });
}
