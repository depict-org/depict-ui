import { catchify } from "../logging/error";
import { Elem } from "../jsx-runtime";

/**
 * For example how to use, check /src/glitter/main.tsx
 * Warning: Don't use margins for the element you want to expand, since the animation will look janky
 * EDIT: above no longer applies if you only have one element that you want to expand
 */
export const useExpandingContainer = ({ duration = 500, delay = 0 } = { duration: 500, delay: 0 }) => {
  let outerRef: HTMLElement;
  let innerRef: HTMLElement;
  let current_animation: Animation | undefined;

  const child_computed_style = () => {
    if (innerRef.childNodes.length === 1) {
      const [first_child] = innerRef.children;
      if (first_child instanceof Element) {
        return getComputedStyle(first_child);
      }
    }
  };

  const get_height = () =>
    (child_computed_style()
      ? parseInt(child_computed_style()!.marginTop) +
        parseInt(child_computed_style()!.marginBottom) +
        parseInt(child_computed_style()!.height)
      : innerRef.clientHeight) + "px";

  const get_current_height_possibly_during_transition = () =>
    (child_computed_style() && outerRef.style.overflow !== "hidden"
      ? parseInt(child_computed_style()!.marginBottom) + parseInt(child_computed_style()!.marginTop) // don't ask me why we need to do this 😭 but I'm sure it works
      : 0) +
    outerRef.clientHeight +
    "px";

  const ExpandingContainer = ({ children }: { children?: Elem | Elem[] }) => {
    if (Array.isArray(children) && children.length === 1) {
      children = children[0];
    }
    innerRef = (<div>{children}</div>) as HTMLDivElement;
    outerRef = (
      <div style={`overflow:hidden;height:0px;visibility:hidden`} aria-hidden="true">
        {innerRef}
      </div>
    ) as HTMLDivElement;

    return outerRef;
  };

  const expand = catchify(async (expanding_delay = delay, time_to_expand = duration) => {
    const start = get_current_height_possibly_during_transition(); // need to read this before cancelling the old animation
    outerRef.style.visibility = "";
    outerRef.removeAttribute("aria-hidden");
    current_animation?.cancel?.(); // cancel already running animation so it doesn't get a finish event while we're still animating
    const animation = outerRef.animate(
      { height: [start, get_height()] },
      {
        duration: time_to_expand,
        delay: expanding_delay,
        easing: "ease-in",
      }
    );
    current_animation = animation;
    animation.addEventListener(
      "finish",
      catchify(() => {
        current_animation = undefined;
        outerRef.style.overflow = "";
        outerRef.style.height = "auto";
      })
    );

    return animation;
  });

  const collapse = catchify(async (collapsing_delay = delay, time_to_collapse = duration) => {
    const start = get_current_height_possibly_during_transition();
    current_animation?.cancel?.();
    outerRef.style.overflow = "hidden";
    outerRef.ariaHidden = "true";
    const animation = outerRef.animate(
      { height: [start, "0px"] },
      {
        duration: time_to_collapse,
        delay: collapsing_delay,
        easing: "ease-out",
      }
    );
    current_animation = animation;
    animation.addEventListener(
      "finish",
      catchify(() => {
        current_animation = undefined;
        outerRef.style.height = "0";
        outerRef.style.visibility = "hidden";
      })
    );

    return animation;
  });

  return {
    ExpandingContainer,
    expand,
    collapse,
  };
};
