import { Accessor, JSX as solid_JSX } from "solid-js";
import { Display } from "@depict-ai/utilishared";
import * as IdTypes from "../category_listing/IdTypes";

import { SearchFilter, SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { FeaturedInDisplay } from "@depict-ai/types/api/FeaturedInResponseV3";

export type SortObjToSendToBackend = SortModel | undefined;

export type ScrollRestorationData = { min_results_loaded: number; for_id: string }[];

export type SDKGridSpacing = string | { horizontal: string; vertical: string };

export type WithRequired<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
}; // https://stackoverflow.com/a/69328045

export type FilterWithData = WithRequired<SearchFilter, "data">;

export type BaseQueryAccessor = Accessor<
  {
    sort?: SortModel;
    filters?: FilterWithData[];
    merchant: string;
    market: string;
  } & (
    | { query: string }
    | { id_to_query_for_: string; id_type_: typeof IdTypes.EXTERNAL_ID | typeof IdTypes.LISTING_ID }
  )
>;
export interface SDKRenderingInfo {
  /**
   * If you call this function with a provided function, the provided function will be called whenever the index of the currently displayed product changes.
   */
  set_on_index_change: (fn: (index: number) => void) => void;
}

export type ProductCardTemplate<T extends Display> = (
  display: T | null,
  info?: SDKRenderingInfo
) => solid_JSX.Element | Promise<solid_JSX.Element>;

// The actual_field property is added in modify_fiters_to_group_title_as_field to enable backwards compatibility with the old filter links (see fix_old_filter_links)
type AddActualFieldToArray<T> = T extends Array<infer U> ? (U & { actual_field?: string })[] : never;

export type AddActualFieldToFilters<T extends SearchFilter[] | undefined> = T extends undefined
  ? undefined
  : AddActualFieldToArray<T>;

export type ProductOrLookCardTemplate<T extends Display | FeaturedInDisplay> = (
  display: T | null,
  info?: SDKRenderingInfo
) => solid_JSX.Element | Promise<solid_JSX.Element>;
