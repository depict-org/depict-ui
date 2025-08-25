import { Disconnector, observer } from "../element-observer";
import { Accessor, createEffect, onCleanup } from "solid-js";
import { dlog } from "../logging/dlog";

const MAX_SYNC_RETRIES = 15;

/**
 * Synchronizes an HTML element's content with a provided Solid.js accessor's value. You can decide what "content" means.
 *
 * By default, the function utilizes the `textContent` property of the provided element to
 * synchronize its text content. However, this behavior can be customized by providing optional
 * `getContent` and `setContent` functions.
 *
 * @param {string} selector - The CSS selector of the target HTML element.
 * @param {Accessor<string | undefined>} data - Solid.js accessor that holds the text data to be synchronized.
 * @param {Object} [opts] - Optional configuration object.
 * @param {Function} [opts.getContent] - A function that retrieves the current content of a given HTML element.
 *                                      If not provided, defaults to retrieving the `textContent` property of the element.
 * @param {Function} [opts.setContent] - A function that sets the content of a given HTML element based on the provided string.
 *                                      If not provided, defaults to setting the `textContent` property of the element.
 */
export function sync_el_content_with_accessor(
  selector: string,
  data: Accessor<string | undefined>,
  opts?: {
    getContent: (el: Element) => string | undefined | null;
    setContent: (el: Element, content: string) => void;
  }
) {
  const { getContent, setContent } = opts || {
    getContent: (el: Element) => el.textContent,
    setContent: (el: Element, content: string) => (el.textContent = content),
  };

  const disconnectors: Disconnector[] = [];

  createEffect(() => {
    const content = data();
    if (!content) {
      return;
    }
    onCleanup(() => {
      disconnectors.forEach(d => d());
    });

    let retries = 0;

    const sync_data = ({ element }: { element: Element }) => {
      if (retries++ > MAX_SYNC_RETRIES) {
        return dlog("Failed to sync meta text to element. Hit max retries.", selector, content);
      }
      if (!element || getContent(element) === content) {
        return;
      }
      setContent(element, content);
    };

    disconnectors.push(
      observer.onremoved(selector, sync_data),
      observer.onchange(selector, sync_data),
      observer.onexists(selector, sync_data)
    );
  });
}
