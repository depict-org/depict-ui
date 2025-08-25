import { Display } from "@depict-ai/utilishared";
import { BreadCrumbs } from "../category_listing/components/BreadCrumbs";
import { DepictCategory, get_shared_category_properties } from "./category_listing";
import { DEPICT_ID } from "../shared/ids";
import { createMemo, JSX } from "solid-js";
import { QuickLinks } from "../category_listing/components/QuickLinks";

const InExternalAreaDiv = ({ children }: { children?: JSX.Element }) =>
  (
    <div id={DEPICT_ID.PLP_CATEGORY} class="depict plp category">
      {children}
    </div>
  ) as HTMLDivElement;

export function SDKBreadCrumbs<T extends Display>({ depict_category }: { depict_category: DepictCategory<T> }) {
  const {
    i18n_,
    breadcrumb_signal_: [crumb_data_],
    router_,
    sorting_query_param_,
    filter_query_param_prefix_,
  } = get_shared_category_properties(depict_category);

  return (
    <InExternalAreaDiv>
      {BreadCrumbs({ i18n_, crumb_data_, router_, sorting_query_param_, filter_query_param_prefix_ })}
    </InExternalAreaDiv>
  ) as HTMLDivElement;
}
export function SDKQuickLinks<T extends Display>({ depict_category }: { depict_category: DepictCategory<T> }) {
  const {
    i18n_,
    quicklinks_signal_: [quicklinks_data_],
    breadcrumb_signal_: [breadcrumb_data_],
    router_,
    sorting_query_param_,
    filter_query_param_prefix_,
  } = get_shared_category_properties(depict_category);
  const id_to_query_for_ = createMemo(() => depict_category.listing_query.id);
  const id_type_ = createMemo(() => depict_category.listing_query.type);

  return (
    <InExternalAreaDiv>
      {QuickLinks({
        i18n_,
        quicklinks_data_,
        router_,
        id_type_,
        id_to_query_for_,
        breadcrumb_data_,
        sorting_query_param_,
        filter_query_param_prefix_,
      })}
    </InExternalAreaDiv>
  ) as HTMLDivElement;
}
