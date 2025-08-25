import { SearchResponseAfterDisplayTransformer } from "../../search/types";
import {
  GetListingResponseAfterDisplayTransformer,
  ProductListingResponseAfterDisplayTransformer,
} from "../../category_listing/types";
import { Display } from "@depict-ai/utilishared";
import { SearchFilter } from "@depict-ai/types/api/SearchResponse";

/**
 * We use group_title for more beautiful urls if possible, this function modifies the search filters in an API response to have group_title as field, when possible.
 * Backend supports accepting group_title as field, so we just pretend it was field in the whole app to avoid major refactoring.
 * But also because it would be a lot more code since it's not guaranteed for group_title to exist. So at all places where we take `field` to send it to the API we'd have to check if group_title exists and use that instead and at all places where we try to pair filters sent from the API and filters set we'd have to both check if `op` and `field` match or if `op` and `group_title` match.
 *
 * This way it's just much simpler - group_title _is_ field for all intents and purposes if it exists, and we don't have to change anything/add lots of if-statements. The only reason we need the old field (actual_field) is for the compatibility with the old filters (see fix_old_filter_links).
 */
export function modify_fiters_to_group_title_as_field<
  O extends
    | SearchResponseAfterDisplayTransformer
    | ({ displays: Display[] } & { failed?: true })
    | ProductListingResponseAfterDisplayTransformer
    | GetListingResponseAfterDisplayTransformer,
>(api_response: O) {
  if ("filters" in api_response) {
    const filters = api_response.filters;
    if (!filters) return api_response;
    const new_filters: (SearchFilter & { actual_field?: string })[] = [];
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const group_title = filter.meta?.group_title?.toLowerCase();
      const new_filter = { ...filter } as (typeof new_filters)[number];
      if (group_title) {
        new_filter.field = group_title;
        new_filter.actual_field = filter.field;
      }
      new_filters.push(new_filter);
    }
    return { ...api_response, filters: new_filters };
  }
  return api_response;
}
