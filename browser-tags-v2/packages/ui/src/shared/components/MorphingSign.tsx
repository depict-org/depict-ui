/** @jsxImportSource solid-js */
import { Accessor } from "solid-js";
import { solid_plp_shared_i18n } from "../../locales/i18n_types";

export function MorphingSign({ expanded_, i18n_ }: { expanded_: Accessor<boolean>; i18n_: solid_plp_shared_i18n }) {
  return (
    <div
      class="morphing-sign"
      classList={{ expanded: expanded_() }}
      role="img"
      aria-label={
        expanded_() ? i18n_.morphing_sign_expanded_aria_label_() : i18n_.morphing_sign_collapsed_aria_label_()
      }
    >
      <span />
      <span />
    </div>
  );
}
