/** @jsxImportSource solid-js */
import { Signal } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { solid_plp_shared_i18n } from "../../../locales/i18n_types";
import { PlusIcon } from "../icons/PlusIcon";

export function ExpandCollapseFilter({
  show_extras_: [get_show_extras, set_show_extras],
  i18n_,
}: {
  show_extras_: Signal<boolean>;
  i18n_: solid_plp_shared_i18n;
}) {
  return (
    <button
      type="button"
      class="expand-filter"
      classList={{ expanded: get_show_extras() }}
      onClick={catchify(() => set_show_extras(p => !p))}
    >
      <PlusIcon />
      <span>{get_show_extras() ? i18n_.view_less_() : i18n_.view_more_()}</span>
    </button>
  );
}
