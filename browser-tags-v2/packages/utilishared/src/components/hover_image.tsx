import { ContainedImage, ImageOptions } from "./image";
import css from "bundle-text:./hover_image.scss";
import { make_sourceset_component } from "./srcset";
import { insert_styling } from "../utilities/integration";
import { catchify } from "../logging/error";

type HoverImageOptions = ImageOptions & {
  mobile_touch_hover?: boolean;
  extra_container_class?: string;
  main_extra_classes?: string;
  second_src?: string;
  second_srcset?: string;
  second_srcset_opts?: Parameters<typeof make_sourceset_component>[0];
  fade_length_seconds?: number;
  /** The minimum amount of time for a touch to be considered a link click */
  navigation_minimum_ms?: number;
};

// Saving bytez
// Maybe? @Daniel
const TOUCHSTART = "touchstart";
const TOUCHEND = "touchend";
const TOUCHMOVE = "touchmove";
const TOUCHCANCEL = "touchcancel";
const MOUSEOVER = "mouseover";
const MOUSELEAVE = "mouseleave";
const HOVER_CLASS = "hovering";
/** This number represents how many elements are in front of div.images-container
 *  Here are the elements: img.depict-img-mod, div, img.depict-img-mod, div, div.second-image-container, div.main-image-container, div.images-container
 * This number is not very dynamic but much more performant than iterating
 */
const HOVER_IMAGE_DEPTH = 7;
const MAX_COLLISION_DETECTION_RATE = 70; // ms

const touch_hover_elements = /*@__PURE__*/ new WeakMap<Element, { navigation_minimum?: number }>();

let listening_for_mobile_hover = false;

function register_element_for_touch_hover(el: Element, navigation_minimum?: number) {
  touch_hover_elements.set(el, { navigation_minimum });
  if (!listening_for_mobile_hover) {
    start_checking_for_touch_hover();
    listening_for_mobile_hover = true;
  }
}

type TouchInfo = { element_: Element; start_time_: number; start_x_: number; start_y_: number };

function start_checking_for_touch_hover() {
  const currently_hovering = new Map<number, TouchInfo>();

  const handle_touch_start = catchify((evt: TouchEvent) => {
    const touch = evt?.changedTouches?.[0];
    if (!touch) return; // Eytys dispatches fake touch events without changedTouches
    const id = touch.identifier;
    const { clientX, clientY } = touch;
    const hover_element = get_hover_element_from_coords(clientX, clientY);
    if (hover_element && touch_hover_elements.has(hover_element)) {
      hover_element.classList.add(HOVER_CLASS);
      touch_hover_elements.set(hover_element, {
        navigation_minimum: touch_hover_elements.get(hover_element)?.navigation_minimum,
      });
      currently_hovering.set(id, {
        element_: hover_element,
        start_time_: +new Date(),
        start_x_: clientX,
        start_y_: clientY,
      });
    }
  });

  let last_collision_check = +new Date();
  const handle_touch_move = catchify((evt: TouchEvent) => {
    const first_touch = evt?.changedTouches?.[0];
    if (!first_touch) return;
    const { identifier, clientY, clientX } = first_touch;
    const our_touch_data = currently_hovering.get(identifier);
    if (!our_touch_data) {
      return;
    }
    if (+new Date() - last_collision_check > MAX_COLLISION_DETECTION_RATE) {
      last_collision_check = +new Date();
      // Checking if the finger has left the image
      if (get_hover_element_from_coords(clientX, clientY) !== our_touch_data.element_) {
        clear_hover(identifier, our_touch_data, clientX, clientY);
      }
    }
  });

  const handle_touch_cancel = catchify((evt: TouchEvent) => {
    const touch = evt?.changedTouches?.[0];
    if (!touch) return;
    const id = touch.identifier;
    const info = currently_hovering.get(id);
    if (info) {
      clear_hover(id, info, touch.clientX, touch.clientY);
    }
  });

  const get_hover_element_from_coords = (clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(clientX, clientY);
    const hover_element = elements[HOVER_IMAGE_DEPTH - 1];
    return hover_element && touch_hover_elements.has(hover_element) ? hover_element : null;
  };

  const clear_hover = catchify((id: number, info_about_touch: TouchInfo, now_x: number, now_y: number) => {
    const { element_, start_y_, start_x_, start_time_ } = info_about_touch;
    const info = touch_hover_elements.get(element_);
    const now = +new Date();
    remove_hover_class: {
      emulate_click: {
        if (!info?.navigation_minimum) break emulate_click;
        const time_touched = now - start_time_;
        if (time_touched >= info.navigation_minimum) break emulate_click;
        // Just above checks led to oversensitive clicks, where a quick swipe in a slider led to product cards being clicked.
        // We're trying to avoid this by not clicking if the mouse moved much or fast
        // We're doing this whole click emulation because MobileSafari doesn't dispatch click events if we listen for touchmove (I *think* it's "move" specifically) so we basically have to emulate clicking heuristics
        // It seems like MobileSafari has a curve based on movement and speed that decides if something counts as a click, but we'll start with something more rudimentary
        const distance_travelled = Math.sqrt(Math.pow(start_x_ - now_x, 2) + Math.pow(start_y_ - now_y, 2)); // https://www.varsitytutors.com/calculus_3-help/distance-between-vectors
        // educated guess that moving the finger 20px will cancel the click regardless
        if (distance_travelled > 20) break emulate_click;
        const swipe_speed = distance_travelled / time_touched; // pixels per millisecond
        if (swipe_speed > 0.2) break emulate_click; // after some testing it feels like a faster swipe than 0.2px/ms would get cancelled by the OS so we cancel that too
        element_.closest("a")?.click();
        break remove_hover_class; //we don’t want to see a quick flash of hover if we’re navigating since that looks bad
      }
      element_.classList.remove(HOVER_CLASS);
    }
    currently_hovering.delete(id);
  });

  window.addEventListener(TOUCHSTART, handle_touch_start);
  window.addEventListener(TOUCHMOVE, handle_touch_move);
  window.addEventListener(TOUCHEND, handle_touch_cancel);
  window.addEventListener(TOUCHCANCEL, handle_touch_cancel);
}

let styling_inserted = false;

export const ContainedHoverImage = ({
  second_src,
  second_srcset,
  second_srcset_opts,
  fade_length_seconds,
  mobile_touch_hover,
  navigation_minimum_ms = 100,
  ...options
}: HoverImageOptions) => {
  if (!styling_inserted) {
    insert_styling(css);
    styling_inserted = true;
  }

  const main_image = ContainedImage({
    ...options,
  });
  const second_image = ContainedImage({
    ...options,
    [second_srcset_opts?.set_dataset === false ? "src" : "data-src"]: second_src || "",
    [second_srcset_opts?.set_dataset === false ? "srcset" : "data-srcset"]: second_srcset || "",
    srcset_opts: second_srcset_opts || {},
  });

  const no_second_img = !second_src && !second_srcset && !second_srcset_opts;

  const images_container = (
    <div class="images-container">
      {!no_second_img && <div class={"second-image-container"}>{second_image}</div>}
      <div class={"main-image-container"}>{main_image}</div>
    </div>
  ) as HTMLDivElement;

  if (no_second_img) {
    return images_container;
  }

  const hover_element = images_container;

  const event_handler_mouse = ({ type }: Event) => {
    if (type == MOUSEOVER) {
      images_container.classList.add(HOVER_CLASS);
      hover_element.addEventListener(MOUSELEAVE, event_handler_mouse, { once: true });
    } else if (type == MOUSELEAVE) {
      images_container.classList.remove(HOVER_CLASS);
    }
  };

  hover_element.addEventListener(MOUSEOVER, event_handler_mouse);
  if (mobile_touch_hover) {
    register_element_for_touch_hover(hover_element, navigation_minimum_ms);
  }

  if (fade_length_seconds) {
    Array.from(images_container.children).forEach(container => {
      (container as HTMLElement).style.transition = `opacity ${fade_length_seconds}s`;
    });
  }

  return images_container;
};
