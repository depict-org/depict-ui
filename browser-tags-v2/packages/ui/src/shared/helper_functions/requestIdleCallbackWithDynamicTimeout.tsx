import { requestIdleCallbackWithGuaranteedTimeout } from "./requestIdleCallbackWithGuaranteedTimeout";
import { catchify, dlog } from "@depict-ai/utilishared";

/**
 * For image loading, ensures they are loaded when the browser is idle or the user not doing much. Basically skips rIC if not less than 20fps for 2s.
 * For image loading, we originally just had a 15s timeout with the comment "long timeout, better to not have images than to freeze the browser. But also we don't want to confuse user why no iamges are loading"
 * The users got confused because sometimes no images were loading. I noticed that chrome didn't seem to respect the timeout, therefore requestIdleCallbackWithGuaranteedTimeout got born
 * However, sometimes it still happens for users that images don't load (https://depictaiworkspace.slack.com/archives/C06TW0GJDL7/p1714381128008869, https://depictaiworkspace.slack.com/archives/C04M8MGCF3K/p1714134547545279, https://depictaiworkspace.slack.com/archives/C05NJ0K3WRL/p1713514866876059). Their browsers are completely idle when that happens. We don't want to decrease the timeout for everyone because then the browser locks up when loading lots of images again, but we need a way to have a shorter timeout for when chrome claims it's busy while it's actually not, and wouldn't lock up by loading images.
 */
export function requestIdleCallbackWithDynamicTimeout(callback: IdleRequestCallback) {
  const page_hasnt_loaded = // @ts-ignore
    globalThis?.performance?.getEntriesByType?.("navigation")?.every?.(e => e?.loadEventEnd) === false;
  const cancelFrameCheck = checkForFrameDipsUntil(
    2000,
    () => {
      cancelIdleCallback();
      // Allow a long time of loading images since otherwise it takes even longer to erroneously load images later
      callback({ didTimeout: false, timeRemaining: () => 1000 });
    },
    page_hasnt_loaded
  );
  const cancelIdleCallback = requestIdleCallbackWithGuaranteedTimeout(
    deadline => {
      cancelFrameCheck();
      callback(deadline);
    },
    // If page hasn't loaded yet, it's more likely we run into the chrome bug than need to delay image loading to not lock up the browser, so only give rIC a 4s timeout
    { timeout: page_hasnt_loaded ? 4000 : 15000 }
  );
}

/**
 * Calls the provided callback function if the browser ran for checkDuration ms without three frame dip below 20 FPS.
 */
function checkForFrameDipsUntil(checkDuration: number, runWhenNoDips: VoidFunction, pageHasntLoaded: boolean) {
  const maxDips = 3;
  const noDipsBelow = 20;
  const fpsOverTime: number[] = [];
  let dipsLeft = maxDips;
  let start = performance.now();
  let cleanedUp = false;
  let lastTime: number | undefined;

  const check = () =>
    requestAnimationFrame(
      catchify(time => {
        if (cleanedUp) return;
        if (lastTime != undefined) {
          const fps = 1000 / (time - lastTime);
          fpsOverTime.push(fps);
          if (fps < noDipsBelow && !dipsLeft--) {
            dlog(
              `FPS dipped below ${noDipsBelow} to ${fps}, bailing from requestIdleCallback shortcut - rIC seems legit`,
              fpsOverTime
            );
            return;
          }
        }
        lastTime = time;
        if (time <= start + checkDuration) {
          check();
        } else {
          if (fpsOverTime.length < (checkDuration / 1000) * noDipsBelow) {
            dlog(
              "Not enough FPS data to determine if we should short-circuit requestIdleCallback, rIC seems legit. FPS:",
              fpsOverTime
            );
            return;
          }
          dlog(
            "Short-circuiting requestIdleCallback (probably bugged) due to only ",
            maxDips - dipsLeft,
            " dips below ",
            noDipsBelow,
            " FPS for ",
            checkDuration,
            "ms. FPS:",
            fpsOverTime
          );
          runWhenNoDips();
        }
      })
    );

  // If page hasn't loaded yet, wait for it to load before starting the check
  // This is because the first few frames until the load event are usually slower
  if (pageHasntLoaded) {
    addEventListener(
      "load",
      () => {
        start = performance.now();
        check();
      },
      { once: true }
    );
  } else {
    check();
  }

  return () => (cleanedUp = true);
}
