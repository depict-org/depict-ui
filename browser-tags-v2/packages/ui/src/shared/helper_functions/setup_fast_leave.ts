import { catchify, Disconnector, href_change_ipns, observer } from "@depict-ai/utilishared";
import { PageReplacer } from "../PageReplacer";

/**
 * makes so that links to the previous page close the search instead of closing the search and reloading the page (to be used with non-spas)
 */
export function setup_fast_leave(pr: PageReplacer) {
  let old_url: undefined | string;
  let disconnect_link_observer: Disconnector | undefined;
  const link_handler = catchify((e: MouseEvent) => {
    const link = (e.currentTarget || e.target) as HTMLAnchorElement;
    if (link.href === old_url) {
      history.pushState(history.state, "", link.href);
      e.preventDefault();
    }
  });
  let remove_added_listeners: Promise<void>;
  let resolve_remove_added_listeners: (value: void | PromiseLike<void>) => void;
  pr.addEventListener(
    "open",
    catchify(() => {
      remove_added_listeners = new Promise(r => (resolve_remove_added_listeners = r));
      disconnect_link_observer = observer.onexists("a", async ({ element }) => {
        element.addEventListener("click", link_handler);
        await remove_added_listeners;
        element.removeEventListener("click", link_handler);
      });
    })
  );
  pr.addEventListener(
    "close",
    catchify(() => {
      disconnect_link_observer?.();
      resolve_remove_added_listeners?.();
    })
  );
  catchify(async () => {
    for await (const href of href_change_ipns) {
      if (!pr.is_page_(new URL(href))) {
        old_url = href;
      }
    }
  })();
}
