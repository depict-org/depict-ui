import { BreadCrumbs as OrigBreadCrumbs } from "@depict-ai/ui";
import { wrap_solid_in_react } from "../../util";
import { createMemo, JSX as solid_JSX } from "solid-js";
import { get_instance_and_track_component } from "../../helpers/get_instance_and_track_component";
import { SolidShowComponentAfterStateSet } from "../../helpers/SolidShowComponentAfterStateSet";

/**
 * BreadCrumbs is the "trail" in the header of a category page.
 * @property stateKey - When using multiple CategoryPage components on the same page, you need to set a unique stateKey for each one. To associate a certain BreadCrumbs component with a certain CategoryPage component, set the same stateKey on both.
 */
export function BreadCrumbs(react_props: { stateKey?: string | undefined }) {
  return wrap_solid_in_react({
    solid_component: solidProps => (
      <SolidShowComponentAfterStateSet>
        <VanillaBreadcrumbs {...solidProps} />
      </SolidShowComponentAfterStateSet>
    ),
    props: react_props,
  });
}

function VanillaBreadcrumbs(props: { stateKey?: string | undefined }) {
  // memo so stateKey can be dynamically changed
  return createMemo(() => {
    const depict_category = get_instance_and_track_component("category", props.stateKey, "BreadCrumbs");

    return OrigBreadCrumbs({ depict_category });
  }) as unknown as solid_JSX.Element;
}
