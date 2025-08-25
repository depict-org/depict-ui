import { QuickLinks as DepictQuickLinks } from "@depict-ai/ui";
import { wrap_solid_in_react } from "../../util";
import { createMemo, JSX as solid_JSX } from "solid-js";
import { get_instance_and_track_component } from "../../helpers/get_instance_and_track_component";
import { SolidShowComponentAfterStateSet } from "../../helpers/SolidShowComponentAfterStateSet";

/**
 * QuickLinks is a component enabling the user to go sideways and downwards in the category tree.
 * @property stateKey - When using multiple CategoryPage components on the same page, you need to set a unique stateKey for each one. To associate a certain QuickLinks component with a certain CategoryPage component, set the same stateKey on both.
 */
export function QuickLinks(react_props: { stateKey?: string | undefined } = {}) {
  return wrap_solid_in_react({
    solid_component: solidProps => (
      <SolidShowComponentAfterStateSet>
        <VanillaQuickLinks {...solidProps} />
      </SolidShowComponentAfterStateSet>
    ),
    props: react_props,
  });
}

function VanillaQuickLinks(props: { stateKey?: string | undefined }) {
  // memo so stateKey can be dynamically changed
  return createMemo(() => {
    const depict_category = get_instance_and_track_component("category", props.stateKey, "QuickLinks");

    return DepictQuickLinks({ depict_category });
  }) as unknown as solid_JSX.Element;
}
