const elem_track_id_map = /*@__PURE__*/ new WeakMap<Node, Set<string>>();

/**
 * @deprecated You should no longer need to use this. Use observer.onexists to add an event listener to an element once it exists.
 */
export function require_event_listener(
  element: Node,
  event: string,
  track_id: any,
  func: EventListenerOrEventListenerObject
) {
  const set_for_el = elem_track_id_map.get(element);
  if (!set_for_el?.has?.(track_id)) {
    if (!(set_for_el instanceof Set)) {
      elem_track_id_map.set(element, new Set([track_id]));
    } else {
      set_for_el.add(track_id);
    }
    element.addEventListener(event, func, true);
  }
}
