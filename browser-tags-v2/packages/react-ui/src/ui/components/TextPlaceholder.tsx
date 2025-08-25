import { TextPlaceholder as SolidTextPlaceholder } from "@depict-ai/ui";
import React from "react";
import { wrap_solid_in_react } from "../../util";
import { hydrate } from "solid-js/web";

/**
 * A Placeholder to use instead of some text, while it's loading. This is the inline version, meant to be embedded into sentences (or exist instead of them), etc.
 * If you want a block version, use `ImagePlaceholder` with `width`and `height` set instead.
 * @property height height of the placeholder. Set to `1em` by default.
 * @property width width of the placeholder. For specific number of characters use `ch`, ex: `width="7ch"`
 * @property className extra classes to add to the placeholder
 * @property style extra styles to add to the placeholder
 */
export const TextPlaceholder: React.FC<
  Parameters<typeof SolidTextPlaceholder>[0] & { className?: string }
> = raw_react_props => {
  const react_props = { class: raw_react_props.className, ...raw_react_props };
  return wrap_solid_in_react({
    solid_component: props_store => SolidTextPlaceholder(props_store),
    props: react_props,
    wrapper_type: "span",
    hydrate_function_when_ssr: hydrate,
    wrapper_style: {
      "height": "100%",
    },
  });
};
