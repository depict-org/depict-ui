import { catchify, href_change_ipns, make_asyncIterable_exiter } from "@depict-ai/utilishared";
import { onCleanup } from "solid-js";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";

export function close_modal_when_navigating_away(
  close_modal: VoidFunction,
  search_query_url_param_name_: string,
  router_: PseudoRouter
) {
  const [exit_iterable, exitable_iterable] = make_asyncIterable_exiter(href_change_ipns);
  const { navigation_to_same_href_listeners_ } = router_;
  let set_initial_values = false;
  let old_pathname: string;
  let old_param_value: string | null;
  // A card linking to the page one is already on doesn't change the href, close the modal anyway so the click does something
  navigation_to_same_href_listeners_.add(close_modal);
  onCleanup(() => navigation_to_same_href_listeners_.delete(close_modal));
  onCleanup(catchify(exit_iterable));
  catchify(async () => {
    for await (const href of exitable_iterable) {
      const u_o = new URL(href);
      const new_pathname = u_o.pathname;
      const new_param_value = u_o.searchParams.get(search_query_url_param_name_);
      if (set_initial_values) {
        if (new_param_value !== old_param_value || new_pathname !== old_pathname) {
          // close modal when pathname or query changes
          close_modal();
          break;
        }
      } else {
        set_initial_values = true;
      }
      old_pathname = new_pathname;
      old_param_value = new_param_value;
    }
  })();
}
