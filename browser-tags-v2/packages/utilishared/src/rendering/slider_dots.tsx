import { dlog } from "../logging/dlog";
import { catchify } from "../logging/error";
import { Amazing_Slider } from "./pure_slider";

export function slider_dots_factory({
  navcont_insertion_fn,
  navdot,
  dontshowonedot = false,
  bitesize,
}: {
  navcont_insertion_fn?: (slider: Amazing_Slider, navcont: HTMLDivElement) => any;
  navdot: (unique_name: number, index: number) => Element;
  dontshowonedot?: boolean;
  bitesize?: number;
}) {
  const button_states: boolean[] = [];

  const unique_name = Math.round(Math.random() * 1000000);
  function constructor_plugin(/*slider_options*/) {
    // this = slider instance
    const navcont = document.createElement("div");
    navcont.classList.add("navigation_dots");

    this.navcont = navcont;
    if (navcont_insertion_fn) {
      navcont_insertion_fn(this, navcont);
    } else {
      const { container } = this;
      container.append(navcont);
    }
  }

  let amount_of_visible_elements = 4; // 4 is just a number to initialize it. Needs to be here so that the event listener gets an updated amount when the window is resized
  function mutation_plugin(
    intersections: IntersectionObserverEntry[],
    intersecting_mutations: Record<number, IntersectionObserverEntry>
  ) {
    const only_visible_children = children => [...children].filter(el => el.offsetParent !== null);
    const { insert_here: sliding, navcont } = this;
    const { children, offsetWidth: width_of_container } = sliding;
    const first_child = children[0] as HTMLElement | undefined;
    const amount_of_elements = only_visible_children(children).length;
    const width_of_one_element = first_child?.getBoundingClientRect().width ?? 0;
    const actual_amount_of_visible_elements = width_of_container / width_of_one_element;
    amount_of_visible_elements = bitesize || actual_amount_of_visible_elements; // also bitesize
    const number_of_slides = Math.round(
      amount_of_elements / amount_of_visible_elements
    ); /* - actual_amount_of_visible_elements + 1*/
    const number_of_radio_buttons = only_visible_children(this.navcont.children).length;
    const first_shown_element = +Object.keys(
      Object.fromEntries(Object.entries(intersecting_mutations).filter(([_, v]) => v.intersectionRatio > 0.1))
    )[0];
    const position = Math.round((first_shown_element / amount_of_elements) * number_of_slides);
    const get_inputs = () => navcont.querySelectorAll("input");

    if (number_of_radio_buttons != number_of_slides) {
      dlog("Number of buttons doesn't match number of slides, rerendering buttons", button_states);
      navcont.innerHTML = "";
      if (number_of_slides === 1 && dontshowonedot) {
        dlog("dontshowonedot is on, not rendering any dots");
        return;
      }
      if (number_of_slides == Infinity) {
        dlog("Infinite number of slides, wtf", number_of_slides);
        return;
      }
      for (let i = 0; i < number_of_slides; i++) {
        const a_navdot = navdot(unique_name, i);
        const input = a_navdot.querySelector("input")!;

        if (process.env.DEBUG === "true" && !input) {
          throw new Error("You need to provide a navdot that contains an <input> element to slider_dots");
        }

        input.checked = button_states[i];

        input.addEventListener(
          "click",
          catchify(e => {
            e.preventDefault();
            e.stopPropagation();
            dlog("Someone checked a box", e);
            this.scroll_to_abs(Math.round(amount_of_visible_elements * i));
            return false;
          })
        );

        navcont.append(a_navdot);
      }
    }

    const inputs = get_inputs();
    for (let i = 0; i < number_of_slides; i++) {
      set_input(inputs[i], i, position == i);
    }
  }

  function set_input(input: HTMLInputElement, index: number, value: boolean) {
    if (button_states[index] !== value) {
      input.checked = value;
      button_states[index] = value;
    }
  }

  return {
    constructor_plugin,
    mutation_plugin,
  };
}
export function navdot(unique_name: string | number) {
  return (
    <label class="checkbox_container">
      <input type="radio" name={`radio-${unique_name}`} />
      <span class="checkmark"></span>
    </label>
  ) as HTMLLabelElement;
}
