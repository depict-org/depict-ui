import { Accessor, createEffect, onCleanup, untrack } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { send_search_query_to_ga } from "./send_search_query_to_ga";

/**
 * Used in SearchModal to let GA know what the user searched for by sending a debounced fake page view
 */
export function send_instant_result_queries_to_ga({
  get_search_field_value_,
  search_query_url_param_name_,
  url_transformer_,
  get_search_query_,
}: {
  get_search_query_: Accessor<string>;
  get_search_field_value_: Accessor<string>;
  search_query_url_param_name_: string;
  url_transformer_?: (url_object: URL) => unknown;
}) {
  // @ts-ignore
  if (process.env.GA === "false") {
    return;
  }
  let debounce_timeout: ReturnType<typeof setTimeout> | undefined;
  const stop_timeout = () => clearTimeout(debounce_timeout);
  const send_to_ga = catchify(() => {
    const fake_url = new URL(location.href);
    const { searchParams } = fake_url;
    searchParams.set(search_query_url_param_name_, untrack(get_search_field_value_));
    searchParams.set("instant_result", "true");
    url_transformer_?.(fake_url);
    send_search_query_to_ga(fake_url);
  });
  onCleanup(() => {
    setTimeout(
      // do it next event loop because search_field_value_ is wrong this one and search_query might be too because we want the old value to be put into the history entry and a framework like NextJS might take some time to navigate
      catchify(() => {
        if (untrack(get_search_query_) === untrack(get_search_field_value_)) {
          stop_timeout();
          // stop debounce since query was most probably submitted so there will be an actual page view once we go to the search page (possibly)
        }
      })
    );
  });
  let first_call = true;
  createEffect(
    catchify(() => {
      get_search_field_value_();
      if (first_call) {
        // we only want to do stuff when it changes
        first_call = false;
        return;
      }
      stop_timeout();
      debounce_timeout = setTimeout(send_to_ga, 2000);
    })
  );
}
