import { ProductListingResponseV3 as GeneratedProductListingResponse } from "@depict-ai/types/api/ProductListingResponseV3";
import { AddActualFieldToFilters } from "../shared/types";
import { GetListingResponse, ProductListing } from "@depict-ai/types/api/GetListingResponse";
import { ModernDisplayWithPageUrl, ProductListingWithAncestors } from "../shared/display_transformer_types";

// Extend the backend types to reflect how they look after the DisplayTransformers has been applied
// Kudos to ChatGPT

export type ProductListingWithPageURL = ProductListing & { page_url: string };

// Mapped type that extends GeneratedProductListingResponse
export type ProductListingResponseAfterDisplayTransformer = {
  [K in keyof GeneratedProductListingResponse]: K extends "displays"
    ? ModernDisplayWithPageUrl<any>[]
    : K extends "filters"
    ? AddActualFieldToFilters<GeneratedProductListingResponse[K]>
    : GeneratedProductListingResponse[K];
};

export type GetListingResponseAfterDisplayTransformer = {
  [K in keyof GetListingResponseWithQuicklinksAndBreadcrumbs]: K extends "breadcrumbs"
    ? ProductListingWithPageURL[]
    : K extends "quick_links"
    ? ProductListingWithPageURL[]
    : GetListingResponseWithQuicklinksAndBreadcrumbs[K];
};

export type GetListingResponseWithQuicklinksAndBreadcrumbs = Omit<
  GetListingResponse,
  "siblings" | "ancestors" | "children"
> & {
  quick_links: ProductListingWithAncestors[];
  breadcrumbs: ProductListingWithAncestors[];
};
