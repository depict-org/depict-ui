/*! Depict.ai search and product listing react SDK wrapper */
// This is where the actual source of your React stuff should live
// Note, if you add an export here, also add one in src-server/main.ts

import { version } from "./version";
import { add_to_version_info } from "@depict-ai/utilishared";
// Not using wildcard export because of https://github.com/parcel-bundler/parcel/issues/8676
export {
  QuickLinks,
  BreadCrumbs,
  ComponentAligner,
  DepictProvider,
  CategoryPage,
  SearchPage,
  ImagePlaceholder,
  TextPlaceholder,
  RecommendationGrid,
  RecommendationSlider,
  LooksSliderOrGrid,
} from "./ui/components/index";

export {
  useSearchModal,
  useSearchField,
  useFetchRecommendations,
  usePerformanceClient,
  useCategoryFilterHelpers,
} from "./ui/hooks/index";
export {
  CategoryTitle,
  embedded_num_products as EmbeddedNumProducts,
  SearchModalV2,
  ClassicSearchModal,
} from "@depict-ai/ui";
export type { ReactContentBlocksByRow, ReactContentBlock } from "./types";
export type { DisplayTransformers } from "@depict-ai/ui";
export type { DepictProductCardProps, DepictProductCard } from "./types";
export type { Locale } from "@depict-ai/ui/locales";

export { version };
export { Navigation } from "./navigation";

add_to_version_info("react-ui", version);
