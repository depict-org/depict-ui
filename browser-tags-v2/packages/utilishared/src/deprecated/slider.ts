// @ts-ignore
import slider_styling from "bundle-text:./slider_styling.css";
import { Amazing_Lazy_Slider } from "../rendering/slider_with_lazy";
import { Slider_Options as Pure_Slider_Options } from "../rendering/pure_slider";
import { catchify } from "../logging/error";
import { Lazyfier_Options } from "../rendering/image_lazyloader";

export interface special_lazyfier_options extends Omit<Lazyfier_Options, "t"> {}

export interface Deprecated_Slider_Options {
  dlog?: Function;
  catchify?: Function;
  dist_to_hide_left?: number;
  dist_to_hide_right?: number;
  stepstoslide?: number;
  arrow_image?: string;
  center_target?: boolean;
  constructor_plugins?: ((arg0: Deprecated_Slider_Options) => any)[];
  mutation_plugins?: ((
    mutations: IntersectionObserverEntry[],
    intersecting_items: Record<number, IntersectionObserverEntry>
  ) => any)[];
  correct_bs_targets?: boolean;
}

const default_image_src =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMy4wLjYsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxwb2x5Z29uIHBvaW50cz0iOSwyLjYgOC4zLDMuNCAxMi40LDcuNSAxLjYsNy41IDEuNiw4LjUgMTIuNCw4LjUgOC4zLDEyLjYgOSwxMy40IDE0LjQsOCAiLz4NCjwvc3ZnPg0K";

/**
 * @deprecated Please use Pro_Slider instead
 */
export class Deprecated_Amazing_Slider extends Amazing_Lazy_Slider {
  constructor(static_options: Deprecated_Slider_Options, override_lazyfier_options?: special_lazyfier_options) {
    const options: Pure_Slider_Options = {
      button_contents: Object.fromEntries(
        ["left", "right"].map(side => [
          side,
          [
            (() => {
              const image = new Image();
              image.src = static_options.arrow_image || default_image_src;
              image.alt = side + " arrow";
              return image;
            })(),
          ],
        ])
      ) as {
        left: [HTMLImageElement];
        right: [HTMLImageElement];
      },
      ...static_options,
    };

    super(options, {
      lazyfinder: {
        unload(image: HTMLImageElement) {
          catchify(async () => {
            if (!image?.dataset?.src?.length) {
              image.dataset.src = image.src;
              image.removeAttribute("src");
            }
          })();
        },
      },
      ...(override_lazyfier_options || {}),
    });
  }
}

export function insert_styling_into_slider(slider: Deprecated_Amazing_Slider) {
  const style_elem = document.createElement("style");
  style_elem.type = "text/css";
  style_elem.append(slider_styling);
  slider.container.appendChild(style_elem);
}
