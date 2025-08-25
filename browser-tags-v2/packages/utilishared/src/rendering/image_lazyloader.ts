import { observer } from "../element-observer";
import { buildThresholdList } from "../utilities/build_threshold_list";
import { querySelectorAllElements } from "../utilities/common_noapi";
import { catchify } from "../logging/error";
import { dlog } from "../logging/dlog";

declare global {
  interface HTMLImageElementWithLoaded extends HTMLImageElement {
    loaded?: boolean;
  }
  interface HTMLSourceElementWithLoaded extends HTMLSourceElement {
    loaded?: boolean;
  }
}
export interface Lazyfier {
  t: {};
  container: HTMLElement;
  selector: string;
  lazyfinder: lazyfinder;
  only_load_intersecting: boolean;
  ignore_data_urls?: boolean; // this currently only goes for when counting an image as loaded
}

export interface Lazyfier_Options {
  container?: HTMLElement;
  lazyfinder?: lazyfinder;
  selector?: string;
  wait_for_dominsertion?: boolean | Promise<any>;
  only_load_intersecting?: boolean;
  verbose?: boolean;
  ignore_data_urls?: boolean;
}

export class Lazyfier {
  intersection_observer: IntersectionObserver;
  #verbose = false;
  #images_on_first_page: HTMLImageElementWithLoaded[] = [];

  #default_lazyfinder = (() => {
    const class_this = this;

    return {
      unload(image: HTMLImageElementWithLoaded) {
        for (const element of [image, ...find_siblings<HTMLSourceElementWithLoaded>(image, "source")]) {
          for (const attr of ["src", "srcset"]) {
            // I spent 30 minutes on debugging and it turns out IE11 always returns undefined for HTMLImageElementWithLoaded.srcset
            const attribute_value = element.getAttribute(attr);
            if (attribute_value?.length) {
              element.dataset[attr] = attribute_value;
              element.removeAttribute(attr);
            }
          }
        }
      },
      load: catchify(async (image: HTMLImageElementWithLoaded) => {
        for (const element of [
          ...find_siblings<HTMLSourceElementWithLoaded>(image, "source"),
          image,
        ] /* this order is of importance as the browser can be *super eager* in loading the images, so if we give the <img> tag src and srcset first it will load the fallback src and then again the proper one*/) {
          if ("loaded" in element) {
            if (class_this.#verbose) {
              dlog(element, "is already loading, not loading again");
            }
            continue;
          }
          if (document?.body?.contains?.(image) === false) {
            if (class_this.#verbose) {
              dlog(element, "has been removed from the DOM, can't load");
            }
            const { elements } = class_this.lazyfinder as { elements: HTMLImageElementWithLoaded[] };
            const index = elements.indexOf(image);
            if (index >= 0) {
              elements.splice(index, 1);
            }
            continue;
          }
          const has_src = element.dataset?.src?.length;
          const has_srcset = element.dataset?.srcset?.length;
          if (has_src || has_srcset) {
            if (class_this.#verbose) {
              dlog("Loading", element);
            }
            element.loaded = false;
            // here it's of importance that we give the browser the srcset first, otherwise it (safari) might start loading the fallback src at first
            if (has_srcset) {
              // in Safari for some reason sometimes the .sizes attribute isn't set yet, like in https://www.notion.so/depictai/Pictures-in-recommendations-are-not-displayed-88e30e0f98de421e94b9eb273aea21dc. In that case, wait up to one event loop execution for it
              if (!element.sizes) {
                await new Promise<void>(resolve => {
                  const mo = new MutationObserver(
                    catchify(_records => {
                      if (element.sizes) {
                        resolve();
                        mo.disconnect();
                      }
                    })
                  );
                  mo.observe(element, { attributes: true, attributeFilter: ["sizes"] });
                  setTimeout(
                    catchify(() => {
                      resolve(); // in case ResizeObserver doesn't set .sizes or something
                      mo.disconnect();
                    })
                  );
                });
              }
              element.setAttribute("srcset", element.dataset.srcset as string);
              element.removeAttribute("data-srcset");
            }
            if (has_src) {
              element.src = element.dataset.src as string;
              element.removeAttribute("data-src");
            }
            class_this.intersection_observer.unobserve(element);
          } else {
            if (element.src?.startsWith?.("data:")) {
              continue;
            }
            // This happens quite often for reasons unknown. One day we will figure out why, or replace this lazyloader with a new one/native.
            if (class_this.#verbose) {
              dlog("Cannot load", element, "as it doesn't have a data-src or data-srcset attribute");
            }
          }
        }
      }),
      get elements() {
        // define ourselves away with an array containing all elements we find. Said array is "listening" and calling unload and add_load_event_listener on every pushed element
        const lazyfinder_this = this;
        const currently_existing = [] as HTMLImageElementWithLoaded[];

        Object.defineProperty(lazyfinder_this, "elements", {
          value: currently_existing,
        });

        class_this.start_observing_for_new_children_();

        return currently_existing;
      },
    };
  })();

  #initiate_new_image(image: HTMLImageElementWithLoaded) {
    if (image.loaded === true || image.loaded === false) {
      if (this.#verbose) {
        dlog("Not lazyloading", image, "because it was loaded before or is loading");
      }
      return;
    }
    catchify(this.lazyfinder.unload!)(image);
    this.#add_load_event_listener(image);
    this.intersection_observer?.observe?.(image); // observe if observer already exists, otherwise it won't and start_observer will do it
  }

  start_observing_for_new_children_(override_container?: HTMLElement) {
    // should ONLY run on our "stock" elements array and is therefore called if "elements" is get in it - which means it's being used
    // it allows us to just add elements to the observed container and have them added to the elements array if they or their children match the selector
    if (!this.container && !override_container) {
      return;
    }

    const container = override_container ?? this.container;

    const mutation_observer = new MutationObserver(
      catchify(mutations => {
        for (let i = 0; i < mutations.length; i++) {
          const matching_added_els = querySelectorAllElements<HTMLImageElementWithLoaded>(
            mutations[i].addedNodes as NodeListOf<Text | Element | Comment>,
            this.selector
          );
          if (matching_added_els.length) {
            if (this.#verbose) {
              dlog(
                "New elements",
                matching_added_els,
                " matching selector",
                this.selector,
                "were aded to",
                container,
                "lazyloading…"
              );
            }

            (this.lazyfinder.elements as HTMLImageElementWithLoaded[]).push(...matching_added_els);
            matching_added_els.forEach(this.#initiate_new_image.bind(this));
          }
        }
      })
    );
    observer.onexists(container, ({ element }) => {
      const new_els = element?.querySelectorAll?.<HTMLImageElementWithLoaded>(this.selector) || [];
      this.lazyfinder.elements!.push(...new_els);
      new_els.forEach(this.#initiate_new_image.bind(this));
      mutation_observer.observe(element, { subtree: true, childList: true });
    });
    observer.onremoved(container, ({ element }) => {
      if (!document.documentElement.contains(element)) {
        mutation_observer.disconnect();
      }
    });
  }

  #add_load_event_listener(element: HTMLImageElementWithLoaded) {
    const handler = catchify((e: Event) => {
      // cookiebot triggers random "load" events on all elements which make the images load before the intersection observer has started
      if (!element.src.length) {
        dlog("ignoring load event", e, "because image doesn't have a src");
        return;
      }
      if (this.ignore_data_urls && element.src.startsWith("data:")) {
        if (this.#verbose) {
          dlog("Ignoring load event", e, "because ignore_data_urls is truthy");
        }
        return;
      }
      element.removeEventListener("load", handler);
      element.loaded = true;
      if (!this.only_load_intersecting) {
        this.#check_if_first_page_has_loaded();
      }
    });
    element.addEventListener("load", handler);
  }

  #unload_images_and_add_load_listeners() {
    const { elements, unload } = this.lazyfinder;
    const caught_unload = catchify(unload!);
    for (let i = 0; i < elements!.length; i++) {
      caught_unload(elements![i]);
      this.#add_load_event_listener(elements![i]);
    }
  }

  #start_observer() {
    let observers_first_call = true;

    if (!this.intersection_observer) {
      this.intersection_observer = new IntersectionObserver(
        catchify((entries: IntersectionObserverEntry[]) => {
          let any_intersected = false;

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const target = entry.target as HTMLImageElementWithLoaded;

            if (entry.intersectionRatio > 0) {
              any_intersected = true;
              if (target.loaded == null) {
                // if it's false it's already loading
                this.lazyfinder.load!(target);
              }
              if (observers_first_call) {
                this.#images_on_first_page.push(target);
              }
            }
          }

          if (any_intersected) {
            observers_first_call = false;
          }
        }),
        {
          root: this.container,
          threshold: buildThresholdList(3),
        }
      );

      const { elements } = this.lazyfinder;
      for (let i = 0; i < elements!.length; i++) {
        this.intersection_observer.observe(elements![i]);
      }
    }
  }

  #check_if_first_page_has_loaded() {
    const loaded_images: HTMLImageElementWithLoaded[] = [];
    const not_loaded_or_loading: HTMLImageElementWithLoaded[] = [];
    const { elements } = this.lazyfinder;

    for (let i = 0; i < (elements?.length ?? 0); i++) {
      if (elements![i].loaded === true) {
        loaded_images.push(elements![i]);
      } else {
        not_loaded_or_loading.push(elements![i]);
      }
    }
    if (this.#images_on_first_page.length >= loaded_images.length) {
      const caught_loading_fin = catchify(this.lazyfinder.load!);
      for (let i = 0; i < not_loaded_or_loading.length; i++) {
        caught_loading_fin(not_loaded_or_loading[i]);
      }
    }
  }

  constructor({
    container,
    lazyfinder,
    selector = [`img`, `source`].map(t => `:not(.d-navbutton) > ${t}:not(.filler):not(.nolazy)`).join(", "),
    wait_for_dominsertion = true,
    only_load_intersecting = false,
    ignore_data_urls = false,
    verbose,
  }: Lazyfier_Options) {
    // store options in class so class instances can be looked at and their options are transparent
    this.container = container!;
    this.selector = selector;
    this.only_load_intersecting = only_load_intersecting;
    this.ignore_data_urls = ignore_data_urls;
    if (verbose) {
      this.#verbose = true;
    }

    // make sure we have a fully-fledged lazyfinder but still allow max customizability
    this.lazyfinder = lazyfinder ||= this.#default_lazyfinder;
    lazyfinder.unload ||= this.#default_lazyfinder.unload;
    lazyfinder.load ||= this.#default_lazyfinder.load;
    if (!("elements" in lazyfinder)) {
      Object.defineProperty(
        lazyfinder,
        "elements",
        Object.getOwnPropertyDescriptor(this.#default_lazyfinder, "elements")!
      );
    }

    this.#unload_images_and_add_load_listeners();

    // check if we need to branch off to an async function and wait for the elements being in the DOM
    if (wait_for_dominsertion) {
      const caught_start_obs = catchify(this.#start_observer).bind(this);
      if (wait_for_dominsertion instanceof Promise) {
        wait_for_dominsertion.then(caught_start_obs);
      } else {
        const el_to_listen_on = container || lazyfinder?.elements?.[0];
        if (el_to_listen_on instanceof Node) {
          observer.wait_for_element(el_to_listen_on).then(caught_start_obs);
        } else {
          dlog("Could not find element to attach event listener to", () => {}); // right click function in inspector and select "jump to definition" to get here
        }
      }
    } else {
      this.#start_observer();
    }
  }
}

export interface lazyfinder {
  elements?: HTMLImageElementWithLoaded[];
  unload?: (element: HTMLImageElementWithLoaded) => void | Promise<void>;
  load?: (element: HTMLImageElementWithLoaded) => void | Promise<void>;
}

export function test_array_proxy_support() {
  let supports = false;
  try {
    const proxied_array = new Proxy([] as number[], {
      set: () => (supports = true),
    });
    proxied_array.push(1);
  } catch (e) {}
  return supports;
}

export function find_siblings<T extends Element>(element: Element, selector: string): T[] {
  const result: T[] = [];
  // this is made to return things in the same order as the browser prioritises <source> elements
  const children = element?.parentElement?.children;
  for (let i = 0; i < (children?.length ?? 0); i++) {
    const selected_element = children![i] as T;
    if (selected_element?.matches?.(selector)) {
      result.push(selected_element);
    }
  }
  return result;
}
