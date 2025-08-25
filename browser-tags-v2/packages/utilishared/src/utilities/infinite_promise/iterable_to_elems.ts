import { reactive_template, ReactiveTemplateValueContents } from "../reactive_template";
import { on_next_navigation } from "../history";
import { make_asyncIterable_exiter } from "./make_asynciterable_exitable";
import { report } from "../../logging/error";

/**
 * Merges an IPNS with `reactive_template` - if the IPNS updates the reactive template's state is updated to what the IPNS returns
 * @param  async_iterable               The async iterable to use
 * @param quit_after_navigation         Whether to stop listening for the IPNS when navigating away
 * @return       An array of elements. Keep a reference to this since its content will update. This is because it's possible that the nodes are not yet in the DOM, meaning replaceWith won't work.
 */
export function iterable_to_elems(
  async_iterable: AsyncIterable<ReactiveTemplateValueContents>,
  quit_after_navigation = true
) {
  const [template_els, _get, set] = reactive_template();
  (async () => {
    const [exit, exitable_iterable] = make_asyncIterable_exiter(async_iterable);
    if (quit_after_navigation) {
      on_next_navigation(exit);
    }
    for await (const els of exitable_iterable) {
      set(els);
    }
  })().catch(e => report([e, "Failed to convert AsyncIterable to elements"], "error"));
  return template_els;
}
