import { on_next_navigation } from "../history";
import { make_asyncIterable_exiter } from "./make_asynciterable_exitable";
import { report } from "../../logging/error";

/**
 * Ensures that the attribute value of an element is what an AsyncIterable resolves with
 * @param  el                                       Element to set attribute on
 * @param  attribute_name                           Name of the attribute to set
 * @param  async_iterable                           AsyncIterable to loop over
 * @param  quit_after_navigation=true               Whether to stop awaiting the AsyncIterable if the page navigates
 * @return                            [description]
 */
export function iterable_to_attribute(
  el: Element,
  attribute_name: string,
  async_iterable: AsyncIterable<string>,
  quit_after_navigation = true
) {
  (async () => {
    const [exit, exitable_iterable] = make_asyncIterable_exiter(async_iterable);
    if (quit_after_navigation) {
      on_next_navigation(exit);
    }
    for await (const new_value of exitable_iterable) {
      el.setAttribute(attribute_name, new_value);
    }
  })().catch(e => report([e, "Failed to set attribute"], "error"));
  return el;
}
