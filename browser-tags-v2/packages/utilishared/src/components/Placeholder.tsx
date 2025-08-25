import css from "bundle-text:./Placeholder.scss";
import { insert_styling } from "../utilities/integration";
import { JSX } from "solid-js";

type PlaceholderProps = Omit<Partial<JSX.IntrinsicElements["div"]>, "style"> & {
  /** Any extra classes togheter with the default `depict-placeholder` class */
  class?: string;
  /** Convinence prop for setting element width */
  width?: string;
  /** Convinence prop for setting element height */
  height?: string;
  /** Will override the usage of width & height */
  style?: string;
};

type PlaceholderImageProps = Omit<PlaceholderProps, "width" | "height" | "style"> & {
  aspect_ratio: number;
};

let inserted = false;

/**
 * A Placeholder with shimmering animation.
 * For text you can use `height="1em"`.
 * For specific number of characters use `ch`, ex: `width="7ch"`
 */
export const Placeholder = ({
  width,
  height = "1em",
  class: extra_classes,
  style = "",
  ...attributes
}: PlaceholderProps) => {
  if (!inserted) {
    // Insert styling on first import
    insert_styling(css);
    inserted = true;
  }

  return (
    // @ts-ignore
    (
      <div
        class={`depict-placeholder${extra_classes ? " " + extra_classes : ""}`}
        style={style ? style : `width:${width};height:${height};`}
        {...attributes}
      ></div>
    ) as HTMLDivElement
  );
};

/**
 * A wrapper of Placeholder with full width and maintained aspect ratio.
 * @see {@link Placeholder}
 */
export const ContainedPlaceholderImage = ({ aspect_ratio, ...attributes }: PlaceholderImageProps) => {
  return (
    <Placeholder
      style={`position:relative;width:100%;padding-bottom:${(1 / aspect_ratio) * 100}%`}
      {...attributes}
    ></Placeholder>
  ) as HTMLDivElement;
};
