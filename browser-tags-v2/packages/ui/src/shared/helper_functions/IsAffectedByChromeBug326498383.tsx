import { catchify, dlog } from "@depict-ai/utilishared";

let cachedValue: Promise<boolean> | undefined;

/**
 * Tests if a browser is affected by https://issues.chromium.org/issues/326498383
 * @returns A promise that resolves to true if the browser is affected
 */
export async function isAffectedByChromeBug326498383() {
  if (cachedValue != undefined) return cachedValue;
  return (cachedValue = checkIfIsAffectedByChromeBug326498383());
}

async function checkIfIsAffectedByChromeBug326498383() {
  let isAffected = true;
  let resolveTimeoutPromise: VoidFunction;
  try {
    const div = (<div style="position:absolute;width:10px;height:10px;overflow:hidden" />) as HTMLDivElement;
    const waitAFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const timeoutPromise = new Promise<void>(r => {
      resolveTimeoutPromise = r;
      setTimeout(
        catchify(() => {
          r();
          div.remove();
        }),
        500
      );
    });
    const { style } = div;
    // Just to get a long string
    div.append(isAffectedByChromeBug326498383 + "");
    document.documentElement.append(div);
    style.overflow = "auto";
    await waitAFrame();
    style.overflow = "hidden";
    await waitAFrame();
    div.scrollTo({ left: 100, top: 100, behavior: "smooth" });
    div.addEventListener(
      "scroll",
      () => {
        isAffected = false;
        // So the test goes fast on not-affected browsers
        resolveTimeoutPromise();
      },
      // Passive to make it more likely to run the callback before our timeout if the browser is under high load during the test
      { once: true, passive: false }
    );
    await timeoutPromise;
  } catch (e) {
    dlog("Failed to check if affected by chrome bug 326498383", e);
  }
  return isAffected;
}
