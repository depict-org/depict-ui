/** @jsxImportSource solid-js */
import { Signal } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { PlusIcon } from "../icons/PlusIcon";
import { focus_without_scroll_jump } from "./focus_without_scroll_jump";

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
  let button!: HTMLButtonElement;
  return (
    <button
      type="button"
      class="expand-filter"
      aria-expanded={get_show_extras()}
      classList={{ expanded: get_show_extras() }}
      ref={button}
      onClick={catchify((event: MouseEvent) => {
        const container = expanding_container_element_;
        const will_expand = !get_show_extras();
        // A click from Enter/Space on the button reports `detail === 0`; a real pointer click reports >= 1.
        // Only hijack focus for keyboard activation - mouse users can see the revealed options and don't need it
        // (and would otherwise get the viewport scrolled and an unexpected focus ring).
        const keyboard_activated = event.detail === 0;
        const had_focus_inside = !!container && container.contains(document.activeElement);
        set_show_extras(will_expand);
        if (will_expand) {
          if (!keyboard_activated) return;
          // The container's `expand()` (run from the consumer's effect after this handler) clears `inert`/`visibility`;
          // focus the first revealed option on the next frame so Tab continues through the newly shown options.
          // Keep the focus move from yanking the viewport down to the first checkbox.
          requestAnimationFrame(
            catchify(() => {
              const first_input = container?.querySelector<HTMLInputElement>("input:not(:disabled)");
              if (first_input) focus_without_scroll_jump(first_input);
            })
          );
        } else if (had_focus_inside) {
          // Keep focus on the toggle when collapsing, otherwise making the container `inert` dumps focus to <body>
          // (Safari doesn't focus buttons on mouse click, so focus can still be inside the container here).
          focus_without_scroll_jump(button);
        }
      })}
    >
      <PlusIcon />
      <span>{get_show_extras() ? i18n_.view_less_() : i18n_.view_more_()}</span>
    </button>
  );
}
