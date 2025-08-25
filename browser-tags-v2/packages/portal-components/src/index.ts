/*! Depict.ai portal components */
// This is where the actual source of your React stuff should live

import { version } from "./version";
import { add_to_version_info } from "@depict-ai/utilishared/latest";
// Not using wildcard export because of https://github.com/parcel-bundler/parcel/issues/8676

export { PortalRecsGrid } from "./components/PortalRecsGrid";
export { PortalRecsSlider } from "./components/PortalRecsSlider";
export { ReactDefaultProductCard } from "./components/ReactDefaultProductCard";
export { ReactSelectedFilters } from "./components/ReactSelectedFilters";
export { ReactFilterBody } from "./components/ReactFilterBody";
export { ExpandingSection } from "./components/ExpandingSection";
export { ReactLookCard } from "./components/ReactLookCard";
export { version };

add_to_version_info("portal-components", version);
