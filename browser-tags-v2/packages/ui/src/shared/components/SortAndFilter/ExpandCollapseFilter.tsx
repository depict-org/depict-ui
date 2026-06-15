/** @jsxImportSource solid-js */
import { Signal } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { PlusIcon } from "../icons/PlusIcon";

export function ExpandCollapseFilter({
  show_extras_: [get_show_extras, set_show_extras],
  i18n_,
  expanding_container_element_,
}: {
  show_extras_: Signal<boolean>;
  i18n_: solid_plp_shared_i18n;
  /**
   * The collapsed/expandable container holding the extra options (the `useExpandingContainer` outer element).
   * Used to move keyboard focus to the first revealed option on expand, since those options sit above this
   * button in the DOM and would otherwise be skipped by Tab.
   */
  expanding_container_element_?: HTMLElement;
}) {
  let button: HTMLButtonElement;
  return (
    <button
      type="button"
      class="expand-filter"
      aria-expanded={get_show_extras()}
      classList={{ expanded: get_show_extras() }}
      ref={button!}
      onClick={catchify(() => {
        const container = expanding_container_element_;
        const will_expand = !get_show_extras();
        const had_focus_inside = !!container && container.contains(document.activeElement);
        set_show_extras(will_expand);
        if (will_expand) {
          // The container's `expand()` (run from the consumer's effect after this handler) clears `inert`/`visibility`;
          // focus the first revealed option on the next frame so Tab continues through the newly shown options.
          requestAnimationFrame(
            catchify(() => container?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus())
          );
        } else if (had_focus_inside) {
          // Keep focus on the toggle when collapsing, otherwise making the container `inert` dumps focus to <body>
          // (Safari doesn't focus buttons on mouse click, so focus can still be inside the container here).
          button.focus();
        }
      })}
    >
      <PlusIcon />
      <span>{get_show_extras() ? i18n_.view_less_() : i18n_.view_more_()}</span>
    </button>
  );
}
