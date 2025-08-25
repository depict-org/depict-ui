import { DisplayTransformers, ProductListingWithAncestors } from "../display_transformer_types";
import { GetListingResponseWithQuicklinksAndBreadcrumbs } from "../../category_listing/types";
import { GetListingResponse } from "@depict-ai/types/api/GetListingResponse";

/**
 * Converts a v3 API response into something that has quick_links and breadcrumbs that behave as in v2 instead of ancestors, children and siblings, but gives every quicklink and breadcrumb's transformer the ancestors of the listing they are for.
 */
export async function create_quicklinks_and_breadcrumbs_and_run_transformer({
  input_data_: { ancestors, children, siblings, ...clonedInputData },
  category_transformer_ = v =>
    v.data as ((typeof v)["data"][number] & {
      page_url: string;
    })[], // in case no display transformer just pass the data through, so we don't break
  merchant_,
  market_,
  locale_,
}: {
  input_data_: GetListingResponse;
  category_transformer_?: NonNullable<DisplayTransformers<any, any>["categories"]>;
  merchant_: string;
  market_: string;
  locale_: string;
}) {
  const breadcrumbs: ProductListingWithAncestors[] = [];
  const clonedAncestors = [...ancestors];

  while (clonedAncestors.length) {
    const ancestor = clonedAncestors.pop()!;
    if (!ancestor.show_in_breadcrumbs) continue;
    breadcrumbs.push({ ...ancestor, ancestors: [...clonedAncestors] });
  }

  breadcrumbs.reverse();

  const quicklinksIsChildren = children.length;
  const quickLinks = (quicklinksIsChildren ? children : siblings)
    .filter(({ show_in_quicklinks }) => show_in_quicklinks)
    .map(productListing => {
      const ancestorsForUs = [...ancestors];
      if (quicklinksIsChildren) {
        ancestorsForUs.push({ ...clonedInputData });
      }
      return { ...productListing, ancestors: ancestorsForUs };
    });

  const [transformedBreadcrumbs, transformedQuickLinks] = await Promise.all([
    category_transformer_({
      merchant: merchant_,
      market: market_,
      locale: locale_,
      data: breadcrumbs,
    }),
    category_transformer_({
      merchant: merchant_,
      market: market_,
      locale: locale_,
      data: quickLinks,
    }),
  ]);

  return {
    ...clonedInputData,
    breadcrumbs: transformedBreadcrumbs,
    quick_links: transformedQuickLinks,
  } as GetListingResponseWithQuicklinksAndBreadcrumbs;
}
