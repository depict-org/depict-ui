import { BreadCrumbs as OrigBreadCrumbs, QuickLinks as OrigQuickLinks } from "@depict-ai/ui";
import { DepictCategoryProvider } from "./DepictCategoryProvider";
import { internalCategory } from "./internal_state";
import { Display } from "@depict-ai/utilishared";

export function BreadCrumbs<T extends Display>({ categoryProvider }: { categoryProvider: DepictCategoryProvider<T> }) {
  return OrigBreadCrumbs({ depict_category: internalCategory.get(categoryProvider)! });
}

export function QuickLinks<T extends Display>({ categoryProvider }: { categoryProvider: DepictCategoryProvider<T> }) {
  return OrigQuickLinks({ depict_category: internalCategory.get(categoryProvider)! });
}
