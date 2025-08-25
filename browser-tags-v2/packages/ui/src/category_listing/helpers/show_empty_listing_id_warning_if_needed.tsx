/** @jsxImportSource solid-js */
import { Accessor, createEffect, getOwner, onCleanup, runWithOwner } from "solid-js";
import { solid_category_i18n } from "../../locales/i18n_types";
import { show_toast } from "../../shared/helper_functions/show_toast";
import { dwarn, is_debug, observer } from "@depict-ai/utilishared";

/**
 * Shows a warning toast + console log message if the category ID is not set and is_debug is true.
 */
export function show_empty_listing_id_warning_if_needed(
  el: HTMLDivElement,
  listing_id: Accessor<string>,
  i18n_: solid_category_i18n
) {
  if (!is_debug) return; // Just to make sure we don't show this in production
  const owner = getOwner()!;

  const disconnect = observer.onexists(el, ({ element }) =>
    runWithOwner(owner, () =>
      createEffect(() => {
        if (!document.documentElement.contains(element)) return;
        if (!listing_id()) {
          const warning =
            "No `id` specified in `listingQuery`, this is probably unintentional. Make sure to create (and insert) the CategoryPage *after* you have specified a listingQuery.";

          dwarn(warning);
          const { close_toast_ } = show_toast({
            class: "warning",
            close_after_: 1000 * 120,
            style: { background: "#ffb830" },
            children: [
              <div class="statement" style="white-space:pre-wrap">
                {warning}
              </div>,
              <div class="buttons">
                <button
                  onClick={
                    () =>
                      close_toast_() /* We have to wait for close_toast_ to get defined after the call to show_toast */
                  }
                  class="ok major"
                >
                  {i18n_.ok_()}
                </button>
              </div>,
            ],
          });
        }
      })
    )
  );
  onCleanup(disconnect);
}
