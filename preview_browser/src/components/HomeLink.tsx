import { A } from "@solidjs/router";
import { link_to_pathname } from "~/helpers/link_to_pathname";
import { collections_category_listing_id_param_name } from "~/helpers/query_params";

export function HomeLink() {
  const href = link_to_pathname("", [collections_category_listing_id_param_name, "query"]);
  return (
    <A class="breadcrumb" href={href()}>
      Back to overview
    </A>
  );
}
