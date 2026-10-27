import { dwarn } from "@depict-ai/utilishared";

let browserIsBugged = false;

/**
 * Had a call with Hope - images didn't load for Mikaela at all. Because not even a single image loaded after 15 seconds, I suspect that there's some chrome bug where requestIdleCallback doesn't honor its timout and just never calls the callback. So this races it with a setTimeout of the timeout + 1 second.
 * Takes the same arguments as requestIdleCallback but returns a function to cancel the callback instead. Assumes requestIdleCallback supported/available.
 * When a setTimeout wins over the timeout in a requestIdleCallback, we won't tell the callback that a timeout happened and will say that there's 500ms ms left. As the chance is large that the browser is bugged, and we now need to quickly do all our work.
 *
 * If setTimeout winws once, we'll assume that the browser is bugged and only wait a quarter of `timeout` in the future (since high chance browser not busy, user waiting for stuff)
 *
 * Safari has no requestIdleCallback, and some third-party scripts polyfill it badly: the accessiBe widget calls the callback with `null` instead of an IdleDeadline.
 * Callers call `deadline.timeRemaining()`, so we hand them a working deadline in that case (images in the search modal never loaded on iOS on sites with accessiBe, Pylon #3529, VROOM-3386).
 */
export function requestIdleCallbackWithGuaranteedTimeout(
  callback: IdleRequestCallback,
  {
    timeout,
  }: {
    timeout: number;
  }
) {
  if (browserIsBugged) timeout /= 4;
  const cancel = () => {
    cancelIdleCallback(idleHandle);
    clearTimeout(racingTimeout);
  };
  const idleHandle = requestIdleCallback(
    deadline => {
      cancel();
      return callback(typeof deadline?.timeRemaining === "function" ? deadline : makeDeadline());
    },
    { timeout }
  );
  const racingTimeout = setTimeout(() => {
    dwarn("Browser did not respect requestIdleCallback timeout");
    browserIsBugged = true;
    cancel();
    callback({
      didTimeout: false,
      timeRemaining() {
        return 500;
      },
    });
  }, timeout + 1000);
  return cancel;
}

/**
 * Stand-in for a missing IdleDeadline: 50ms, the most a real one gives, counting down from when the callback was called
 */
function makeDeadline(): IdleDeadline {
  const start = performance.now();
  return {
    didTimeout: false,
    timeRemaining() {
      return Math.max(0, 50 - (performance.now() - start));
    },
  };
}
