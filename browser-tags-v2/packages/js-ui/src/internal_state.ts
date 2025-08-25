import { DepictCategory, DepictSearch } from "@depict-ai/ui";
import { Display } from "@depict-ai/utilishared";
import { DepictCategoryProvider } from "./DepictCategoryProvider";
import { DepictSearchProvider } from "./DepictSearchProvider";

// A workaround system for completely hiding our @depict-ai/ui internals in wrapped components,
// while still allowing the wrapped components to expose the internals to each other. Each wrapped component is responsible for creating
// the internal instance and storing it in this WeakMap, then other wrapped components can access the internals related to another wrapped component.

export const internalSearch: WeakMap<
  DepictSearchProvider<Display>,
  DepictSearch<Display>
> = /*@__PURE__*/ new WeakMap();
export const internalCategory: WeakMap<DepictCategoryProvider<any>, DepictCategory<any>> = /*@__PURE__*/ new WeakMap();
