import { ImagePlaceholder as SolidImagePlaceholder } from "@depict-ai/ui";
import React from "react";
import { wrap_solid_in_react } from "../../util";
import { hydrate } from "solid-js/web";

/**
 * A placeholder that can be used instead of an image or other block of content while it's loading.
 * The placeholder has `display:block`, meaning it will create a new "row" in the layout for itself. Can be used either for images with a defined aspect ratio (ContainedImage) or blocks.
 * @property aspectRatio if aspectRatio is defined the placeholder will be in "image mode" and fill out the available width and then adjust the height according to the aspectRatio
 * @property width If width and height is set, the defined width and height will be used.
 * @property height If width and height is set, the defined width and height will be used.
 * @property class extra classes to add to the placeholder
 * @property style extra styles to add to the placeholder
 */
export const ImagePlaceholder: React.FC<
  Parameters<typeof SolidImagePlaceholder>[0] & { className?: string }
> = raw_react_props => {
  const react_props = { class: raw_react_props.className, ...raw_react_props };
  return wrap_solid_in_react({
    solid_component: props_store => SolidImagePlaceholder(props_store),
    props: react_props,
    wrapper_type: "span",
    hydrate_function_when_ssr: hydrate,
  });
};
