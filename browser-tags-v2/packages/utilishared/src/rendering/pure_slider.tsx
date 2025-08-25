import { Node_Iterable } from "./recommendation-renderer/types";
import { observer } from "../element-observer";
import { buildThresholdList } from "../utilities/build_threshold_list";
import { err } from "../deprecated/err";
import { catchify, report } from "../logging/error";
import { dlog } from "../logging/dlog";

export interface Slider_Options {
  /**
   * Controls within what distance to hide the left slider button.
   * The distance is in pixels to the leftmost part of the slider container from the first element in the slider
   *
   * Defaults to `10`
   */
  dist_to_hide_left?: number;
  /**
   * Controls within what distance to hide the right slider button.
   * The distance is in pixels to the rightmost part of the slider container from the last element in the slider
   *
   * Defaults to `10`
   */
  dist_to_hide_right?: number;
  stepstoslide?: number;
  center_target?: boolean;
  constructor_plugins?: ((arg0: Slider_Options) => any)[];
  mutation_plugins?: ((
    mutations: IntersectionObserverEntry[],
    intersecting_items: Record<number, IntersectionObserverEntry>
  ) => any)[];
  correct_bs_targets?: boolean;
  button_contents?: { right: Node_Iterable; left: Node_Iterable };
  button_elems?: { right: HTMLElement; left: HTMLElement };
  autoinvalidate_cache?: boolean;
}

export class Amazing_Slider {
  // this is just here because it's often needed together with the slider

  container = (<div class="depict-slider depict"></div>) as HTMLDivElement;
  elements_ = {
    sliding_el_: (<div class="sliding"></div>) as HTMLDivElement,
    left_: (<button aria-label="Scroll left" class="left d-navbutton" type="button"></button>) as HTMLElement,
    right_: (<button aria-label="Scroll right" class="right d-navbutton" type="button"></button>) as HTMLElement,
  };
  insert_here = this.elements_.sliding_el_;
  intersecting_items_object: {
    [key: string]: IntersectionObserverEntry;
    [key: number]: IntersectionObserverEntry;
  } = {};
  #mutation_plugins: ((
    this: Amazing_Slider,
    entries: IntersectionObserverEntry[],
    intersecting_items: {
      [key: string]: IntersectionObserverEntry;
      [key: number]: IntersectionObserverEntry;
    }
  ) => any)[] = []; // array of functions called in the intersection observer, like #hide_buttons_if_needed
  stepstoslide = 2;
  dist_to_hide_left = 10;
  dist_to_hide_right = 10;
  center_target = false;
  correct_bs_targets = true;
  snap_style?: HTMLStyleElement;
  on_elements_changed: ((records: MutationRecord[]) => any)[] = [this.#observe_element];
  #index_cache: {
    last_el_: number | undefined;
    number_to_el_: Map<number, Element>;
    el_to_number_: Map<Element, number>;
  } = { last_el_: undefined, number_to_el_: new Map(), el_to_number_: new Map() };
  #cached_visible_sizes:
    | Map<
        Element,
        {
          total_visible: number;
          ratio_visible: number;
          margin_left: number;
          margin_right: number;
          rect: DOMRect;
        }
      >
    | undefined;

  #observe_element(records: MutationRecord[]) {
    const { observer } = this;
    const { sliding_el_ } = this.elements_;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element && node.parentElement === sliding_el_) {
          observer.observe(node);
        }
      }
      for (const node of record.removedNodes) {
        if (node instanceof Element && node.parentElement === sliding_el_) {
          observer.unobserve(node);
        }
      }
    }
  }

  #observer_callback(entries: IntersectionObserverEntry[]) {
    const intersecting_items = this.intersecting_items_object;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { target } = entry;
      const rec_idx = this.get_index_of_element(target);
      if (entry.intersectionRatio <= 0) {
        for (const key in intersecting_items) {
          if (intersecting_items[key].target === target) {
            delete intersecting_items[key];
          }
        }
      } else {
        if (rec_idx != null) {
          intersecting_items[rec_idx] = entry;
        } else {
          dlog("Could not find index of", target, "ignoring observer record");
        }
      }
    }
    catchify(this.#hide_buttons_if_needed).call(this);

    const mutation_plugins = this.#mutation_plugins;
    for (let i = 0; i < mutation_plugins.length; i++) {
      catchify(mutation_plugins[i]).call(this, entries, intersecting_items);
    }
  }

  observer = new IntersectionObserver(this.#observer_callback.bind(this), {
    root: this.elements_.sliding_el_,
    threshold: buildThresholdList(100),
  });

  observe = this.observer.observe.bind(this.observer);

  get_index_of_element(target: Element | HTMLElement) {
    const { el_to_number_ } = this.#index_cache;
    const value_from_cache = el_to_number_.get(target);
    if (value_from_cache) {
      return value_from_cache;
    }

    const children = target?.parentElement?.children;
    if (children) {
      const children_as_array = [...children];
      const index = children_as_array.indexOf(target);
      el_to_number_.set(target, index);
      return index;
    }
  }

  #hide_buttons_if_needed() {
    // it should be correct that this routine is using sliding_el because for the buttons the position of the first and last element to the main container is relevant
    const cont = this.elements_.sliding_el_,
      lastel = this.index_of_last_element,
      cont_rect = cont.getBoundingClientRect(),
      is = this.intersecting_items_object;
    let dist_to_left: number;
    if (is[0] && is[0]?.intersectionRatio < 0.9) {
      // the intersection observer won't trigger again FOR THE LEFT IMAGE when we're very far to the left, this works around that
      dist_to_left = is[0].boundingClientRect.left - cont_rect.left;
    } else {
      const first_element = this.element_by_index(0);
      if (first_element) {
        dist_to_left = first_element.getBoundingClientRect().left - cont_rect.left; // need to check anyways because some very violent scrolls will make the buttons go missing otherwise
      } else {
        // slider is empty
        dist_to_left = 0;
      }
    }
    if (dist_to_left >= -this.dist_to_hide_left) {
      this.#visibility(this.elements_.left_, 0);
    } else {
      this.#visibility(this.elements_.left_, 1);
    }

    const rightmost_edge_of_last_card = Math.floor(
      (
        this.element_by_index(lastel) || this.elements_.sliding_el_
      ) /* when slider is empty, just take slider element. Dunno if this works but it stops the throwing */
        .getBoundingClientRect().right
    );

    const rightmost_edge_of_container = cont_rect.right,
      dist_to_right = rightmost_edge_of_last_card - rightmost_edge_of_container;

    // dlog("dist to right", dist_to_right, "dist to left", dist_to_left);

    if (dist_to_right <= this.dist_to_hide_right) {
      this.#visibility(this.elements_.right_, 0);
    } else {
      this.#visibility(this.elements_.right_, 1);
    }
  }

  first_intersecting_index(min_ratio = 0.5): number {
    return parseInt(
      Object.keys(this.intersecting_items_object).find(
        i => this.intersecting_items_object[i].intersectionRatio > min_ratio
      ) || ""
    );
  }

  get first_intersecting(): IntersectionObserverEntry {
    return this.intersecting_items_object[this.first_intersecting_index()];
  }

  get index_of_last_element(): number {
    return (this.#index_cache.last_el_ ??=
      (this.first_intersecting?.target?.parentElement?.children?.length ?? // this is for plantagen which has a double whammy slider
        this.elements_?.sliding_el_?.children?.length) - 1);
  }

  get currently_selected() {
    // this tries to be what distance_to assumes is the current card when converting a relative offset into an absolute one, available for plugins
    if (this.center_target) {
      // try to find index of card under container center
      const { visible_sizes } = this;
      let left_offset = 0;
      const rectangle_of_container = this.elements_.sliding_el_.getBoundingClientRect();
      const middle_of_container = rectangle_of_container.width / 2;

      for (const [element, info] of visible_sizes) {
        left_offset += info.total_visible;
        if (left_offset >= middle_of_container) {
          // we found the card that's under the center!
          return this.get_index_of_element(element)!;
        }
      }
    } else {
      return this.first_intersecting_index(0.9);
    }
  }

  #distance_to(offset: number, is_absolute = false) {
    const intersecting_items = this.intersecting_items_object; // the privateFieldGet babel polyfill isn't very fast so for extra snappyness I won't get it multiple times
    dlog("intersecting_items", intersecting_items);

    // I know I could have made this.intersecting_items_object a simple array instead, but maybe someone needs the boundingrect information in it some day. Also I thought I could use it, but it isn't always up to date due to the intersection observer not triggering on every scrolling move.
    // Now, some months later: the triggering frequency can easily be adjusted, the problem is that the observer doesn't trigger on hidden elements, meaning when scrolling left we don't have information about the hidden element's position from the observer

    let target: number; // absolute index to focus on

    if (is_absolute) {
      target = offset;
    } else {
      if (this.center_target) {
        const { currently_selected } = this;
        if (currently_selected == null) {
          // if for whatever reason we don't find a card, don't do anything
          report(new Error("can't find card in center"), "error");
          return 0;
        }

        target = currently_selected + offset;
      } else {
        let index_of_first_intersecting: string | number;
        // we don't want the first one to count as intersecting just because it's 20% visible
        if (offset < 0) {
          index_of_first_intersecting = this.first_intersecting_index(0.9);
          if (isNaN(index_of_first_intersecting)) {
            index_of_first_intersecting = this.first_intersecting_index(); // if this doesn't yield element, try to get all
          }
        } else {
          index_of_first_intersecting = this.first_intersecting_index();
        }
        target = +index_of_first_intersecting + offset;
      }
    }
    target = Math.floor(target);

    let dist: number;
    dlog("trying to focus target", target);

    let target_element = this.element_by_index(target);

    if (!target_element) {
      if (this.correct_bs_targets) {
        if (isNaN(target)) {
          dlog("target is not a number", target, "can't correct");
          return 0;
        } else if (target < 0) {
          dlog("Target", target, "is < 0, correcting to 0 because correct_bs_targets is enabled");
          target = 0;
          target_element = this.element_by_index(target);
          if (!target_element) {
            dlog("can't find element 0");
            return 0;
          }
        } else {
          dlog("target", target, "does not exist, correcting to last sliding element 🤭");
          target = this.index_of_last_element;
          target_element = this.element_by_index(target);
          if (!target_element) {
            dlog("last element", target, "could not be found");
            return 0;
          }
        }
      } else {
        dlog(
          "target is bs, can't find",
          target,
          "by either data-index attribute or as child of",
          this.elements_.sliding_el_
        );
        return 0;
      }
    }

    const rectangle_of_target = target_element.getBoundingClientRect();
    const distance_of_li = rectangle_of_target.left + (target % 1) * rectangle_of_target.width;
    const rectangle_of_container = this.elements_.sliding_el_.getBoundingClientRect();
    const distance_of_container = rectangle_of_container.left;
    dist = distance_of_li - distance_of_container;

    if (this.center_target) {
      try {
        const { visible_sizes } = this;
        const keys = [...visible_sizes.keys()];
        const middle_value_index = Math.floor(visible_sizes.size / 2);
        const target_card = keys[middle_value_index];
        const target_info = visible_sizes.get(target_card);
        const coords_of_container_center = distance_of_container + rectangle_of_container.width / 2;
        const coords_of_chosen_card_center = target_info!.rect.left + target_info!.rect.width / 2;
        dist = coords_of_chosen_card_center - coords_of_container_center;
        const num_cards_off_target = target - this.get_index_of_element(target_card)!;
        if (num_cards_off_target !== 0) {
          const biggest_card = Math.max(...[...visible_sizes.values()].map(s => s.total_visible));
          dist += biggest_card * num_cards_off_target;
        }
      } catch (e) {
        err(e);
      }
    }
    return dist;
  }

  get visible_sizes() {
    if (this.#cached_visible_sizes) {
      return this.#cached_visible_sizes;
    }
    const visible_sizes = new Map<
      Element,
      {
        total_visible: number;
        ratio_visible: number;
        margin_left: number;
        margin_right: number;
        rect: DOMRect;
      }
    >();
    const visible_cards = Object.keys(this.intersecting_items_object).map(key => +key);
    const to_calculate = [visible_cards[0] - 1, ...visible_cards, visible_cards[visible_cards.length - 1] + 1]
      .map(index => this.element_by_index(+index))
      .filter(e => e);
    const root_el = this.elements_.sliding_el_;
    const root = root_el.getBoundingClientRect();
    const root_computed_style = getComputedStyle(root_el);
    const root_left = root.left - parseInt(root_computed_style.marginLeft);
    const root_right = root.right + parseInt(root_computed_style.marginRight);
    // const root_width = root_right - root_left;
    // this.#visualize(root_left + "px", "green");
    // this.#visualize(root_right + "px", "red");
    for (let i = 0; i < to_calculate.length; i++) {
      const element = to_calculate[i];
      if (!element) {
        continue;
      }
      const card = element.getBoundingClientRect();
      const card_computed_style = getComputedStyle(element);
      const marginLeft = parseInt(card_computed_style.marginLeft);
      const marginRight = parseInt(card_computed_style.marginRight);
      const card_left = card.left - marginLeft;
      const card_right = card.right + marginRight;
      // this.#visualize(card_left + "px", "rgba(255,0,0,0.5)");
      // this.#visualize(card_right + "px", "rgba(0,255,0,0.5)");

      const actual_left_diff = root_left - card_left;
      const left_diff = actual_left_diff > 0 ? actual_left_diff : 0;
      const actual_right_diff = card_right - root_right;
      const right_diff = actual_right_diff > 0 ? actual_right_diff : 0;
      const intersecting_line = card_right - card_left - left_diff - right_diff;

      if (intersecting_line < 0) {
        continue;
      }
      visible_sizes.set(element, {
        total_visible: intersecting_line,
        get ratio_visible() {
          const card_width = card_right - card_left;
          return intersecting_line / card_width;
        },
        margin_left: marginLeft,
        margin_right: marginRight,
        rect: card,
      });
    }
    this.#cached_visible_sizes = visible_sizes;
    // let's assume we can cache this for a tick since the slider scrolls smoothly so there's no point in reading it instantly again and assuming a different value
    queueMicrotask(catchify(() => (this.#cached_visible_sizes = undefined)));
    return visible_sizes;
  }

  get cards_fitting_in_viewport() {
    // we can't use intersectionRatio since it's a) also in the y-axis and b) doesn't contain borders and margins
    const visible_sizes = [...this.visible_sizes.values()].map(e => e.total_visible);

    const max = Math.max(...visible_sizes);
    const min1 = Math.min(...visible_sizes);
    visible_sizes.splice(visible_sizes.indexOf(min1), 1);
    const min2 = Math.min(...visible_sizes);
    visible_sizes.splice(visible_sizes.indexOf(min2), 1);
    if (min1 + min2 <= max) {
      visible_sizes.push(min1 + min2);
    } else {
      visible_sizes.push(min1, min2);
    }
    return visible_sizes.length;
  }

  // #visualize(left: string, color: string) {
  //   const div = document.createElement("div");
  //   div.style.position = "fixed";
  //   div.style.top = "50vh";
  //   div.style.left = left;
  //   div.style.width = "1px";
  //   div.style.height = "10cm";
  //   div.style.background = color;
  //   document.body.append(div);
  //   setTimeout(() => div.remove(), 1000);
  // }

  element_by_index(index: number) {
    const from_cache = this.#index_cache.number_to_el_.get(index);
    if (from_cache) {
      return from_cache;
    }
    const { sliding_el_ } = this.elements_;
    let maybe_el = [...(sliding_el_?.children || [])]?.[index];
    if (!maybe_el) {
      // this is for plantagen which has a double whammy slider
      maybe_el = [...(this.first_intersecting?.target?.parentElement?.children || [])]?.[index];
    }
    this.#index_cache.number_to_el_.set(index, maybe_el);
    return maybe_el;
  }

  #visibility(element: Element | HTMLElement, should_be_visible: boolean | number) {
    const ishidden = element.classList.contains("hidden");
    if (should_be_visible && ishidden) {
      element.classList.remove("hidden");
    } else if (!should_be_visible && !ishidden) {
      element.classList.add("hidden");
    }
  }

  #setup_buttons() {
    const goleft = catchify(() => this.#scroll_to(-this.stepstoslide, false, -510));
    const goright = catchify(() => this.#scroll_to(this.stepstoslide, false, 510));
    const { right_, left_ } = this.elements_;
    left_.addEventListener("click", goleft);
    right_.addEventListener("click", goright);
    [left_, right_].forEach((button: HTMLElement) => {
      button.addEventListener("dragstart", e => (e.preventDefault(), false));
    });
  }

  #create_element_structure(autoinvalidate = true) {
    const es = this.elements_;
    this.#setup_buttons();
    this.container.append(es.left_, es.right_);
    this.container.append(es.sliding_el_);
    if (autoinvalidate) {
      const cache_mo = new MutationObserver(
        catchify(records => {
          this.invalidate_cache();
          for (const extra_fn of this.on_elements_changed) {
            extra_fn.call(this, records);
          }
        })
      );
      observer.onexists(es.sliding_el_, ({ element }) => {
        this.invalidate_cache();
        cache_mo.observe(element, {
          childList: true,
          subtree: true,
        });
        for (const kid of element.children) {
          this.observer.observe(kid);
        }
        observer.wait_for_listener("removed", element).then(el => {
          if (document.documentElement.contains(el)) return; // Don't accidentally disconnect if we already got re-inserted
          cache_mo.disconnect();
        });
      });
    }
  }

  invalidate_cache() {
    // dlog("Invalidating index cache");
    this.#index_cache.number_to_el_.clear();
    this.#index_cache.el_to_number_.clear();
    this.#index_cache.last_el_ = undefined;
  }

  #scroll_to(offset: number, is_absolute = false, fallback_scroll_distance = 500, harsh = false) {
    const left = catchify(this.#distance_to).call(this, offset, is_absolute);
    const distance_after_fallback_applied = Math.round(left ?? fallback_scroll_distance);

    if (
      getComputedStyle(this.elements_.sliding_el_).scrollSnapType !== "none" &&
      Math.abs(distance_after_fallback_applied) < 10
    ) {
      dlog(
        "Not scrolling because snapping is enabled and distance not over threshold",
        distance_after_fallback_applied
      );
      return;
    }

    dlog("Trying to scroll by", left, "px", "before fallback,", distance_after_fallback_applied, "after");

    this.elements_.sliding_el_.scrollBy({
      left: distance_after_fallback_applied,
      top: 0,
      behavior: harsh ? "auto" : "smooth",
    });
  }

  scroll_to_rel(offset: number, harsh = false) {
    this.#scroll_to(offset, false, undefined, harsh);
  }

  scroll_to_abs(offset: number, harsh = false) {
    this.#scroll_to(offset, true, undefined, harsh);
  }

  constructor({
    dist_to_hide_left,
    dist_to_hide_right,
    stepstoslide,
    center_target,
    mutation_plugins,
    constructor_plugins,
    correct_bs_targets,
    button_contents,
    button_elems,
    autoinvalidate_cache,
  }: Slider_Options) {
    dist_to_hide_left && (this.dist_to_hide_left = dist_to_hide_left);
    dist_to_hide_right && (this.dist_to_hide_right = dist_to_hide_right);
    stepstoslide && (this.stepstoslide = stepstoslide);
    center_target && (this.center_target = true);
    mutation_plugins && (this.#mutation_plugins = mutation_plugins);
    correct_bs_targets == false && (this.correct_bs_targets = correct_bs_targets);
    if (button_elems) {
      this.elements_.right_ = button_elems.right;
      this.elements_.left_ = button_elems.left;
    }
    if (button_contents?.right) {
      this.elements_.right_.append(...button_contents.right);
    }
    if (button_contents?.left) {
      this.elements_.left_.append(...button_contents.left);
    }

    catchify(this.#create_element_structure).call(this, autoinvalidate_cache);

    // @ts-ignore
    this.elements_.sliding_el_.slider = this; // dunno if this is dumb? So far nordicagolf/kondomvaruhuset depend on it

    // plugin functionality i.e. for dots
    const constructor_args = arguments;
    constructor_plugins?.forEach?.(mplugin => {
      catchify(mplugin).call(this, constructor_args);
    });
  }
}
