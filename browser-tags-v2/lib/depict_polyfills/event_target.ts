import EventTargetPolyfill from "@ungap/event-target";

// ideally we would execute this after the globalThis polyfill and use globalThis here
if (typeof window === "object" && !current_et_is_constructable()) {
  window.EventTarget = EventTargetPolyfill; // polyfill EventTarget. This is also needed in the "modern" scripts because mobilesafari < 14 doesn't support it.
  // it is also needed on old safari versions (~13) which have a native EventTarget which can't be constructed
}

function current_et_is_constructable() {
  let works = false;
  try {
    works = "addEventListener" in new EventTarget();
  } catch (e) {}
  return works;
}
