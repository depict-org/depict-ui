import { Accessor, createMemo, createSignal, onCleanup } from "solid-js";
import { catchify, href_change_ipns, make_asyncIterable_exiter } from "@depict-ai/utilishared";

/**
 * Helper function used by the suggestions displayed in the SearchModal to make links to an updating URL that change the search query when clicked but can be cmd-clicked as real links
 */
export function link_to_param_change({
  param_,
  value_,
  url_transformer_,
}: {
  param_: string;
  value_: Accessor<string>;
  url_transformer_?: (url_object: URL) => unknown;
}) {
  const [get_current_href, set_current_href] = createSignal<string>(location.href);
  const [exit_iterable, exitable_iterable] = make_asyncIterable_exiter(href_change_ipns);
  onCleanup(exit_iterable);
  catchify(async () => {
    for await (const href of exitable_iterable) {
      // use native links so ppl can cmdclick/right click and open in new tab and see target URL
      set_current_href(href);
    }
  })();

  return createMemo(() => {
    const u_o = new URL(get_current_href());
    url_transformer_?.(u_o);
    u_o.searchParams.set(param_, value_());
    return u_o.href;
  });
}
