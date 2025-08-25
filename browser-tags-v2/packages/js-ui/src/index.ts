import { version } from "./version";
import { add_to_version_info } from "@depict-ai/utilishared";
/* "DepictProvider" equivalents, but split to be tree-shakeable */
export { DepictCategoryProvider } from "./DepictCategoryProvider";
export { DepictSearchProvider } from "./DepictSearchProvider";

export { SearchPage } from "./SearchPage";
export { SearchField } from "./SearchField";
export { CategoryPage } from "./CategoryPage";
export { SetupPageReplacer } from "./PageReplacer";

export { fetchDepictRecommendations, ClassicSearchModal, SearchModalV2 } from "@depict-ai/ui";
export { RecommendationSlider } from "./RecommendationSlider";
export { RecommendationGrid } from "./RecommendationGrid";
export { LooksSliderOrGrid } from "./LooksSliderOrGrid";

export type { JSUIContentBlock, JSUIContentBlocksByRow } from "./types";
export type { ProductCardTemplate as DepictProductCard } from "@depict-ai/ui";
export { TextPlaceholder, ImagePlaceholder } from "./Placeholders";
export { contentBlockStore } from "./helpers/contentBlockStore";

export { onExistsObserver } from "./observer";

export { BreadCrumbs, QuickLinks } from "./breadcrumbs_quicklinks";

export { embedded_num_products as EmbeddedNumProducts, CategoryTitle } from "@depict-ai/ui";
export type { DisplayTransformers } from "@depict-ai/ui";

export { DPC } from "@depict-ai/dpc";

export { version };
add_to_version_info("js-ui", version);
