import { observer } from "../element-observer";
import { err } from "../deprecated/err";
import { catchify } from "../logging/error";
import { async_iterable_ipns, IPNS } from "../utilities/infinite_promise/async_iterable_ipns";
import { dlog } from "../logging/dlog";
import { JSX } from "solid-js";

export const resize_base_url =
  "https://img.depict.ai/ResizeImage" + (process.env.TENANT ? "/" + process.env.TENANT : "");
export const is_safari = /*@__PURE__*/ (() =>
  typeof navigator === "undefined" ? false : /^((?!chrome|android).)*safari/i.test(navigator.userAgent))(); // https://stackoverflow.com/a/23522755

/**
 * make_sizes_setter attaches a ResizeObserver to what_to_watch and returns a function to call to set the `sizes` attribute of the provided el_to_resize attribute to the width of `what_to_watch` on every ResizeObserver callback
 * @param  what_to_watch               Element to watch resizing of
 * @param sizes_communicator the IPNS which communicates the sizes. You can provide your own to get access to the watched sizes. This is usable i.e.to set "width" and "height" attributes to satisfy lighthouse flawed anti layout shift suggestions
 * @param resolution_factor a factor to multiply the target-to-display resolution with
 * @return A function that will set the `sizes` atribute of the provided element to the size of `what_to_watch`, continuously
 */
export function make_sizes_setter(
  what_to_watch: HTMLElement,
  sizes_communicator = async_iterable_ipns<number>(),
  resolution_factor = 1
) {
  let currently_live = false;
  const ro = new ResizeObserver(
    catchify(records => {
      for (let j = 0; j < records.length; j++) {
        const { width } = records[j].contentRect;
        if (!width) {
          continue;
        }
        // add extra 5% just in case. + safari is (in some cases) acting a bit questionable and needs a third extra to fill the set width
        const new_size = width * 1.05 * (is_safari ? 4 / 3 : 1) * resolution_factor;

        sizes_communicator(Math.round(new_size));
      }
    })
  );
  // start and stop ResizeObserver to make sure we're not hindering GC
  observer.oncreation(what_to_watch, ({ element }) => {
    ro.observe(element);
    currently_live = true;
  });
  observer.onremoved(what_to_watch, () => {
    ro.disconnect();
    sizes_communicator.exit();
    currently_live = false;
  });
  if (document.documentElement.contains(what_to_watch)) {
    ro.observe(what_to_watch); // if already in DOM, start observing directly
    currently_live = true;
  }

  const start_updating_sizes_of_el = async (el_to_resize: HTMLSourceElement | HTMLImageElement) => {
    for await (const target_size of sizes_communicator) {
      const target_size_in_px = target_size + "px";
      (el_to_resize.sizes &&= target_size_in_px) || el_to_resize.setAttribute("sizes", target_size_in_px);
    }
  };

  return async (el_to_resize: HTMLSourceElement | HTMLImageElement) => {
    const weakrefd_el_to_resize = new WeakRef(el_to_resize);
    // if the watched el exits it will run .exit on the IPNS and exit the iterators.
    // then if it's recreated, the observer below will restart the iterators.
    observer.oncreation<HTMLSourceElement | HTMLImageElement>(what_to_watch, async ({ disconnector }) => {
      const el_to_update = weakrefd_el_to_resize.deref();
      if (!el_to_update) {
        disconnector(); // we're useless, el got GCd
        return;
      }
      await start_updating_sizes_of_el(el_to_update);
    });
    if (currently_live) {
      await start_updating_sizes_of_el(el_to_resize);
    }
    // FYI: this will still hold strong references to the els that get their sizes attribute set until the watched el is removed from the DOM and GC'd. I wrote a version before where that's not the case which you can find here: https://gitlab.com/depict-ai/depict.ai/-/merge_requests/1901/diffs?commit_id=111d72c0f58777786dfcc00cc18d76cb0ac96c7c and I didn't end up using because I think it's wasting too many CPU cycles
  };
}

/**
 * This function returns a function that can be used as JSX component.
 * It builds upon `make_sizes_setter` and uses it to set the `sizes` attribute of <source> and a fallback <img> tag that it creates.
 * @param what_to_watch The Element representative of all other images which size will be used to determine the required image sizes for the other images.
 * @param set_dataset Whether to set `img.src` or `img.dataset.src`. If you're using Lazyfier (builtin to Pro_Slider) the latter is better. Defaults to true.
 * @param formats An array of formats supported by the backends "ResizeImage" to allow the browser to use
 * @param resolutions  An array of resolutions to generate a srcset for
 * @param sizes_communicator IPNS of which the resolution sets the `sizes` attribute on the images
 * @param sizes_setter_ a sizes setter returned by make_sizes_setter, you can provide one if you created it before creating the images
 * @param resolution_factor a factor to multiply the target-to-display resolution with
 * @param market_  market to append to ResizeImage proxy, see discussion here: https://depictaiworkspace.slack.com/archives/C02KVDZ8YHZ/p1649162060750759?thread_ts=1649152089.815529&cid=C02KVDZ8YHZ. It's opt-in but should always be set for integrations that have very many images (like a million+)
 *
 * @example Per surface:
 * `const SourcesetComponent = make_sourceset_component(first_canvas, true, ["webp", "png", "tiff"]);`
 * and then instead of your <img> tags: `<SourcesetComponent data-src={d.image_url} class="image" />`
 */

export function make_sourceset_component({
  what_to_watch,
  set_dataset = true,
  formats = ["webp", "jpeg"],
  resolutions = [64, 128, 256, 300, 400, 512, 1024, 2048, 4096],
  sizes_communicator,
  resolution_factor,
  market_,
  sizes_setter_,
}: {
  what_to_watch?: HTMLElement;
  set_dataset?: boolean;
  formats?: string[];
  resolutions?: number[];
  sizes_communicator?: IPNS<number>;
  resolution_factor?: number;
  market_?: string;
  sizes_setter_?: ReturnType<typeof make_sizes_setter>;
} = {}) {
  /**
   * We support what_to_watch being optional, meaning we will take the first image we get.
   * For that we need to have created the image before being able to create the sizes setter.
   */
  const local_base_url = market_ ? resize_base_url + "/" + market_ : resize_base_url;

  return (image_options: Partial<JSX.IntrinsicElements["img"]> & { class?: string }) => {
    const raw_src = image_options?.src || image_options?.["data-src"]; // get wanted src
    const src = new URL(raw_src, location.origin).href;
    if (!src) {
      dlog(image_options, () => {}); // noop function is to allow to get here quickly by "jump to function definition"
      err(new Error("no image src provided: " + src));
      return <img {...image_options} />; // we don't want everything to fail if someone misused this component
    }
    // Create an array of elements that will get their `sizes` attribute updated when what_to_watch resizes
    const sources: (HTMLImageElement | HTMLSourceElement)[] = [];

    // Create <source> tags for all wanted formats
    for (let i = 0; i < formats.length; i++) {
      // Much faster than .map and this will run kinda often
      const format = formats[i];
      const srcset = make_srcset(src, format, resolutions);
      sources.push(
        (
          // 0px important because chrome will load the biggest size otherwise until sizes attribute is set to the correct value
          <source sizes="0px" type={`image/${format}`} {...(set_dataset ? { "data-srcset": srcset } : { srcset })} />
        ) as HTMLSourceElement
      );
    }

    const opts_without_src = { ...image_options }; // Prevents the image from instantly loading the original source
    delete opts_without_src["src"];
    delete opts_without_src["srcset"];
    const the_image = (<img {...opts_without_src} />) as HTMLImageElement; // create image
    sources.push(the_image); // chrome seems to be the dumbest piece of cake that has ever existed and just load the first source?????
    what_to_watch ||= the_image;
    sizes_setter_ ||= make_sizes_setter(what_to_watch, sizes_communicator, resolution_factor); // now we can finally create the sizes_setter

    // start a sizes_setter for every source (including fallback image)
    for (let i = 0; i < sources.length; i++) {
      sizes_setter_(sources[i]).catch(err);
    }

    // embed all sources into a <picture> so that the browser understands they're "together"
    const picture = <picture>{sources}</picture>;

    // Create src and srcset for fallback image and set it.
    // This is so that the browser doesn't start loading the fallback image for fun (chrome loads very eagerly)
    const fallback_src = optimized_img_url_generator("png", src, 400);
    const fallback_srcset = make_srcset(src, "png", resolutions, local_base_url);
    if (set_dataset) {
      the_image.dataset.srcset = fallback_srcset;
      the_image.dataset.src = fallback_src;
    } else {
      the_image.setAttribute("srcset", fallback_srcset);
      the_image.src = fallback_src;
    }

    return picture;
  };
}

/**
 * Adds query parameters from the `params` parameter to the `base` url.
 * Guaranteed to be correctly escaped and not doubled and perfectly formatted
 * @param base base url, can be relative
 * @param  params an object like `{'param1': 'value'}` that will lead to `?param1=value` on the url
 * @return an absolute URL with the added query parameters
 */
export function make_url_with_query_params(base: string, params: { [key: string]: any }) {
  // do this so we don't end up in escape hell
  const url_object = new URL(base, location.origin);
  const search = new URLSearchParams(Object.entries(params));
  url_object.search = search.toString();
  return url_object.href;
}

function make_srcset(url: string, format: string, resolutions: number[], local_base_url = resize_base_url) {
  return resolutions.map(width => `${optimized_img_url_generator(format, url, width)} ${width}w`).join(", ");
}

function optimized_img_url_generator(format: string, url: string, width: number) {
  // using make_url_with_query_params takes ~100ms on CDON with 2 surfaces and hover images, we can't afford that when it could be essentially free
  return `${resize_base_url}?format=${format}&url=${encodeURIComponent(url)}&width=${width}`;
}
