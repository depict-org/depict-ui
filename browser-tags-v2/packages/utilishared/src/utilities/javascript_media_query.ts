import { catchify } from "../logging/error";

/**
 * A wrapper around window.matchMedia, basically cross browser compatibly adds an event listener to a media query that triggers when it changes
 * @param  query                 The media query (without `@media`)
 * @param  catchified_handler    The function to execute
 * @param initial_call           If the handler should be called instantly with the current state of the media query
 * @return                       An object containing `remove`, a function which removes the event listener again
 */
export function javascript_media_query( // inspired by code in houdinisportswear modify script
  query: string,
  handler: (e: MediaQueryListEvent | MediaQueryList | { matches: false }) => void,
  initial_call: boolean = true
) {
  const catchified_handler = catchify(handler, "Error in media query listener callback");
  if (typeof window !== "object") {
    // on server call the handler in case nothing is rendered if it isn't called, then do nothing
    catchified_handler({ matches: false });
    return {
      remove() {},
    };
  }

  const media_query = window?.matchMedia?.(query);

  if (initial_call && media_query) {
    catchified_handler(media_query);
  }

  let the_function: Function;
  if ((the_function = media_query?.addEventListener)) {
    the_function.call(media_query, "change", catchified_handler);
  } else if ((the_function = media_query?.addListener)) {
    the_function.call(media_query, catchified_handler);
  }

  return {
    remove() {
      let remove_function: MediaQueryList["removeListener"] | MediaQueryList["removeEventListener"];
      if ((remove_function = media_query?.removeEventListener)) {
        remove_function.call(media_query, "change", catchified_handler);
      } else if ((remove_function = media_query?.removeListener)) {
        remove_function.call(media_query, catchified_handler);
      }
    },
  };
}
