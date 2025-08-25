import css from "bundle-text:./image.scss";
import { make_sourceset_component } from "./srcset";
import { classlist } from "../jsx-runtime";
import { insert_styling } from "../utilities/integration";

export interface ImageOptions extends Partial<HTMLImageElement> {
  aspect_ratio: number;
  class?: string;
  rendering_options?: Record<any, any>;
  srcset_opts?: Parameters<typeof make_sourceset_component>[0];
  alt: string; // Required for accessibility
  remove_on_error?: boolean;
  /**
   * If true, inserts grey placeholder svg's before the image lazyloader and the sourceset component add the real source
   */
  init_with_placeholder?: boolean;
}

const rendering_options_to_sourceset_component = /*@__PURE__*/ new WeakMap<
  Record<any, any>,
  WeakRef<ReturnType<typeof make_sourceset_component>>
>();

// Add nolazy to placeholders to avoid errors with the stupid lazyfier
const add_nolazy_to_placeholder = (type?: string) => (type === "placeholder" ? "nolazy" : "");
export const placeholder_svg = (image_width: number, image_height: number, color = "#f6f7f8") =>
  `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='${image_width}' height='${image_height}' xmlns:v='https://vecta.io/nano'%3e%3cpath d='M0 0h${image_width}.016v${image_height}.01H0' fill='${encodeURIComponent(
    color
  )}'/%3e%3c/svg%3e`;

let inserted = false;
/**
 * Contained image gives an image (a container with) intrinsic size of the given aspect ratio, filling out available space.
 * It means that images with different aspect ratios will all take the same amount of space
 * and the sides where it doesn't fit the aspect ratio will be filled with transparent.
 * It makes sure the images doesn't get squished like setting `width` and `height` would do.
 * @param aspect_ratio The aspect ratio of the image, i.e. 4/3 = 1,3̅
 * @param alt Alt text of the image
 * @param remove_on_error Whether to remove the image if loading fails
 * @param rendering_options The rendering options. Please always provide this, it's only optional for compatibility reasons.
 *    You should provide the `rendering_options` to the second argument, InfoForProcessing, provided to a template or preprocessor.
 *    When provided to a postprocessor of a recommendation-renderer it will be the third argument
 *    If you provide this, ContainedImage will automatically use `make_sourceset_component`
 *    and the image resizing proxy to get you responsive images in a modern format (webp).
 * @param srcset_opts The options passed to `make_sourceset_component`, only used if `rendering_options` is set.
 * @param Everything else: attributes on the <img> tag
 * @returns It depends on options and build target. But it's always one HTMLElement.
 */
export const ContainedImage = ({ init_with_placeholder, ...options }: ImageOptions) => {
  if (!inserted) {
    // Insert styling on first import
    insert_styling(css);
    inserted = true;
  }
  const img =
    process.env.BUILD_TARGET === "modern" || process.env.BUILD_TARGET === "dev"
      ? Image(options)
      : CompatibleImage(options);

  if (init_with_placeholder) {
    // 10000 is a magic value, that is just supposed to be bigger than the size of the actual image.
    img.querySelectorAll("img").forEach(i => (i.src = placeholder_svg(10000 * options.aspect_ratio, 10000)));
  }
  return img;
};

function Image({
  aspect_ratio,
  alt,
  remove_on_error,
  rendering_options,
  srcset_opts,
  init_with_placeholder: _,
  ...image_options
}: ImageOptions): HTMLElement {
  const div = (
    <div style={`position:relative;width:100%;padding-bottom:${(1 / aspect_ratio) * 100}%`}></div>
  ) as HTMLDivElement;

  const sourceset_component = srcset_comp_from_map_or_new(rendering_options, srcset_opts, div);
  const IMG_tag = image_options.src?.startsWith("data:") || !sourceset_component ? "img" : sourceset_component;

  div.append(
    // @ts-ignore
    <IMG_tag
      alt={alt}
      {...(remove_on_error ? { onerror: "this.remove()" } : {})}
      {...image_options}
      class={classlist(["depict-img-mod ", image_options.class, add_nolazy_to_placeholder(rendering_options?.type)])}
    />
  );

  return div;
}

function CompatibleImage({
  aspect_ratio,
  alt,
  remove_on_error,
  rendering_options,
  srcset_opts,
  ...image_options
}: ImageOptions): HTMLElement {
  const canvas = (
    <canvas class="depict-img-filler" width={3000 * aspect_ratio} height={3000}></canvas>
  ) as HTMLCanvasElement;
  const sourceset_component = srcset_comp_from_map_or_new(rendering_options, srcset_opts, canvas);
  const IMG_tag = image_options.src?.startsWith("data:") || !sourceset_component ? "img" : sourceset_component;

  return (
    <div style="position:relative">
      <div class="depict-img-cont">
        {/*@ts-ignore*/}
        <IMG_tag
          alt={alt}
          {...(remove_on_error ? { onerror: "this.remove()" } : {})}
          {...image_options}
          class={classlist([
            "depict-img-comp",
            image_options.class,
            add_nolazy_to_placeholder(rendering_options?.type),
          ])}
        />
      </div>
      {canvas}
    </div>
  ) as HTMLDivElement;
}

function srcset_comp_from_map_or_new(
  rendering_options?: Record<any, any> | null,
  srcset_opts: Parameters<typeof make_sourceset_component>[0] = {},
  canvas?: HTMLElement
) {
  let sourceset_component: ReturnType<typeof make_sourceset_component> | undefined;
  if (typeof rendering_options == "object" && rendering_options) {
    sourceset_component = rendering_options_to_sourceset_component.get(rendering_options)?.deref?.();
    if (!sourceset_component) {
      const cloned_opts = { ...srcset_opts };
      cloned_opts.what_to_watch = canvas;
      sourceset_component = make_sourceset_component(cloned_opts);
      rendering_options_to_sourceset_component.set(rendering_options, new WeakRef(sourceset_component));
    }
  }
  return sourceset_component;
}
