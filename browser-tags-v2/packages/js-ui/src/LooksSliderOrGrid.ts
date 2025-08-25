import {
  defaultColsAtSize,
  defaultGridSpacing,
  DisplayTransformers,
  LooksSliderOrGrid as SDKLooksSliderOrGrid,
  ModernDisplayWithPageUrl,
  SDKColsAtSize,
  SDKGridSpacing,
} from "@depict-ai/ui";
import { ModernDisplay } from "@depict-ai/utilishared";
import { type JSX } from "solid-js";
import { plp_shared_i18n } from "@depict-ai/ui/locales";

/**
 * Renders a grid or slider containing look cards for the looks available for a certain product (provided productId).
 */
export function LooksSliderOrGrid({
  gridSpacing,
  gridOptions,
  market,
  merchant,
  priceFormatting,
  backendLocale,
  title,
  productId,
  columnsAtSize,
  imagePlaceholderAspectRatio = 0.75,
  displayTransformers,
  class: classValue,
}: {
  gridSpacing?: SDKGridSpacing;
  columnsAtSize?: SDKColsAtSize;
  /**
   * The id of the product to show looks for
   */
  productId: string;
  merchant: string;
  market: string;
  /**
   * The locale to use for the backend requests, a string containing the locale name (for example "en"). Check the dropdown on demo.depict.ai for the available locales.
   */
  backendLocale: string;
  /**
   * Aspect ratio of the placeholder for the main (outfit) image.
   */
  imagePlaceholderAspectRatio?: number | string;
  title?: JSX.Element;
  class?: string;
  /**
   * Display transformers to apply when fetching looks.
   */
  displayTransformers?: DisplayTransformers<ModernDisplay, ModernDisplayWithPageUrl<ModernDisplay>>;
  /**
   * If provided, will render as grid instead of slider
   */
  gridOptions?: {
    viewMoreButton?: {
      text: string;
      startRows?: number;
      rowsPerClick?: number;
    };
    maxRows?: number;
  };
  /**
   * Price formatting object for formatting the prices in the looks cards.
   */
  priceFormatting: plp_shared_i18n["price_formatting_"];
}): HTMLElement {
  const viewMoreButton = gridOptions?.viewMoreButton;

  return SDKLooksSliderOrGrid({
    gridSpacing_: gridSpacing ?? defaultGridSpacing,
    locale_: backendLocale,
    title_: title,
    market_: market,
    merchant_: merchant,
    displayTransformers_: displayTransformers,
    priceFormatting_: priceFormatting,
    imagePlaceholderAspectRatio_: imagePlaceholderAspectRatio,
    columnsAtSize_: columnsAtSize ?? defaultColsAtSize,
    productId_: productId,
    class_: classValue,
    gridOptions_: gridOptions && {
      max_rows: gridOptions.maxRows,
      view_more_button: viewMoreButton && {
        start_rows: viewMoreButton.startRows,
        rows_per_click: viewMoreButton.rowsPerClick,
        text: viewMoreButton.text,
      },
    },
  });
}
