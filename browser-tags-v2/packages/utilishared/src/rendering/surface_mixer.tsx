import { layout_media_query_header } from "./recommendation-renderer/layout";
import { on_next_navigation } from "../utilities/history";
import { catchify, report } from "../logging/error";
import { reactive_template } from "../utilities/reactive_template";
import { async_iterable_ipns, IPNS } from "../utilities/infinite_promise/async_iterable_ipns";
import { Surface } from "../utilities/integration";
import { dlog } from "../logging/dlog";
import { javascript_media_query } from "../utilities/javascript_media_query";
import { Display } from "./recommendation-renderer/types";

type RenderingFunction<T extends Display> = (...args: any[]) => Promise<{
  surface_: Surface<T> | void;
  cache_until_?: Promise<any>;
}>;

/**
 * Makes it possible to have "multiple surfaces" in one surface. So you provide multiple functions that return a `Surface` and get one `Surface` which will switch between the `Surface`s returned by the different functions depending on which one is selected by an IPNS.
 * @param  surface_rendering_functions_               An array of functions returning an object that contains a Surface and a Promise until which's resolvement the Surface will be cached and re-used without calling the rendering function again.
 * @param  current_surface_                           An IPNS representing which Surface should currently be chosen. It has to resolve with a number corresponding with the index of a function in surface_rendering_functions_.
 * @return a `Surface` object which, utilising a `reactive_template` always represents the currently chosen surface
 */
export async function surface_mixer<T extends Display>({
  surface_rendering_functions_,
  current_surface_,
}: {
  surface_rendering_functions_: RenderingFunction<T>[];
  current_surface_: IPNS<number>;
}) {
  let resolve_success_promise: (value: boolean | PromiseLike<boolean>) => void;
  const success_promise = new Promise<boolean>(r => (resolve_success_promise = r));
  const cache = new Map<number, Surface<T>>();
  const [template_els, _get, set_els] = reactive_template();
  const catchified_switch_to_surface = catchify(switch_to_surface);

  catchify(async () => {
    for await (const surface of current_surface_) {
      const rendering_function = surface_rendering_functions_[surface];
      catchified_switch_to_surface(
        surface,
        rendering_function,
        current_surface_,
        cache,
        set_els,
        resolve_success_promise
      );
    }
  })();

  const fake_surface = {
    elements: template_els,
    should_stay_inserted: success_promise,
  } as Surface<T>;

  return fake_surface;
}

async function switch_to_surface<T extends Display>(
  surface_index: number,
  rendering_function: RenderingFunction<T>,
  current_surface_ipns: IPNS<number>,
  cache: Map<number, Surface<T>>,
  set_els: ReturnType<typeof reactive_template>[2],
  resolve_success_promise: (value: boolean | PromiseLike<boolean>) => void
) {
  let rendered_surface = cache.get(surface_index);
  if (!rendered_surface) {
    const { cache_until_, surface_ } = await rendering_function().catch(
      e => (
        report([e, "error in rendering"], "warning"),
        {} as {
          surface_: undefined;
          cache_until_: undefined;
        }
      )
    );

    if (!surface_ || !surface_?.elements?.length) {
      dlog("Got no/empty surface, not switching");
      // also tell insert_surface that we didn't get recs so it can revert, dunno if we want this
      resolve_success_promise(false);
      return;
    }

    rendered_surface = surface_;
    if (cache_until_ instanceof Promise) {
      cache.set(surface_index, surface_);
      cache_until_.then(catchify(() => cache.delete(surface_index)));
    }
  }

  if (current_surface_ipns.state !== surface_index) {
    dlog(
      "Surface switched to",
      current_surface_ipns.state,
      "while rendering surface",
      surface_index,
      "discarding results"
    );
    return;
  }

  set_els(rendered_surface.elements);
  if (rendered_surface.should_stay_inserted instanceof Promise) {
    // if there is promise that says if surface succeeded or not, use that
    rendered_surface.should_stay_inserted.then(
      catchify((success: boolean) => {
        resolve_success_promise(success);
      })
    );
  } else {
    // otherwise let's just assume it suceeded since there are elements
    resolve_success_promise(true);
  }
}

/**
 * To be used in conjunction with surface_mixer. Makes it possible to switch Surface depending on screen size
 * @param  surface_per_size               An array of arrays which represent which surface to show at which screen width. The arrays in the array can have up to three entries, the first one being: an index in the surface_rendering_functions_ array passed to `surface_mixer`, the second one: min screen width to switch to this surface, the third one: max screen width at which this surface should still be shown.
 * @param  cleanup_promise                Optional. A promise after which sizes_to_surface stops listening for media query changes. If none is provided we automatically stop listening on navigation away (if the href changes).
 * @return An IPNS resolving with the number of the surface that should currently be shown
 */
export function sizes_to_surface(
  surface_per_size: [surface_index: number, min: string | null, max?: string][],
  cleanup_promise?: Promise<any>
) {
  let microtask_queued = false;
  const ipns = async_iterable_ipns<number>();
  const target_indexes = new Set<number>();
  const dedupe_overlapping_queries = catchify(() => {
    microtask_queued = false;

    const first_value = target_indexes[Symbol.iterator]().next().value;
    if (first_value === ipns.latest_call_value) {
      dlog("surface", first_value, "is already selected");
    } else {
      ipns(first_value);
    }

    if (target_indexes.size > 1) {
      const error_string =
        "Multiple matching media queries detected, used first one: " +
        JSON.stringify(surface_per_size.filter(([index]) => target_indexes.has(index)));
      target_indexes.clear();
      throw new Error(error_string);
    }
    target_indexes.clear();
  });

  surface_per_size.forEach(([surface_index, min, max]) => {
    const media_query = layout_media_query_header(min as string, max)
      .split("@media ")
      .pop()!;

    const { remove } = javascript_media_query(media_query, ({ matches }) => {
      if (!matches) {
        return;
      }
      target_indexes.add(surface_index);
      if (!microtask_queued) {
        queueMicrotask(dedupe_overlapping_queries);
        microtask_queued = true;
      }
    });
    if (cleanup_promise instanceof Promise) {
      cleanup_promise.then(remove);
    } else {
      on_next_navigation(remove);
    }
  });
  return ipns;
}

/**
 * Returns a promise that resolve the next time the href is changed
 */
export function promise_until_next_navigation() {
  return new Promise<string | undefined>(r => on_next_navigation(r));
}
