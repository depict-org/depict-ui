import { Accessor, Setter, untrack } from "solid-js";
import { PseudoRouter } from "../../shared/helper_functions/pseudo_router";

/**
 * Used in search for submitting the query when one presses enter. Keep in mind that this logic is somewhat "duplicated" in link_to_param_change for the suggestions in the modal but there it's links doing the changing and a couple other differences
 * Very similar to link_to_param_change but not completely the same
 */
export async function submit_query_handler({
  on_submit_with_unchanged_value_,
  search_param_name_,
  set_search_field_value_,
  get_search_query_,
  url_transformer_,
  router_,
  after_submit_,
  get_new_query,
}: {
  on_submit_with_unchanged_value_?: VoidFunction;
  search_param_name_: string;
  set_search_field_value_: Setter<string>;
  get_search_query_: Accessor<string>;
  url_transformer_?: (url_object: URL) => unknown;
  after_submit_?: VoidFunction;
  get_new_query: () => string;
  router_: PseudoRouter;
}) {
  const new_search_query = get_new_query();
  const previous_query = untrack(get_search_query_);
  if (previous_query === new_search_query && new URLSearchParams(location.search).has(search_param_name_)) {
    // don't push a history entry / re-search if someone submits a search again
    // do close the modal though
    on_submit_with_unchanged_value_?.();
    return;
  }
  set_search_field_value_(previous_query); // restore the value to the previous query since this one goes to the new history entry
  const target_url = new URL(location.href);
  url_transformer_?.(target_url);
  target_url.searchParams.set(search_param_name_, new_search_query);
  await router_.navigate_.go_to_({ new_url_: target_url, is_replace_: false, force_spa_navigation_: true });
  set_search_field_value_(new_search_query);
  scrollTo(0, 0);
  after_submit_?.();
}
