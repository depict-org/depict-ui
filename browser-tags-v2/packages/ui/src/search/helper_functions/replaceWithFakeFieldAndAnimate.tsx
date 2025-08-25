import {
  Accessor,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  getOwner,
  JSX as solid_JSX,
  onCleanup,
  runWithOwner,
  Setter,
  Signal,
  untrack,
} from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { genericModalClosingAnimations, genericModalOpeningAnimations } from "./modalV2Animations";
import { guaranteeAlignment } from "./guaranteeAlignment";
import { queueMacroTask } from "@depict-ai/utilishared/latest";

/**
 * Helper function used in SDKSearchField and in the SearchPage to achieve an animation starting from the modal being aligned to the clicked searchfield to the modal being centered on the page and the search field as wide as possible.
 * Can't animate the actual search field since other content on the page might be affected so we have to align a clone to it and animate that
 */
export function replaceWithFakeFieldAndAnimate({
  actualField_,
  makeFakeField_,
  wrap_,
  bodyAlignmentSignal_: [, setBodyAlignment_],
  backdropStyleSignal_: [, setBackdropStyle_],
  setPollAlignment_,
  buttonInField_,
  modalSearchFieldOuterWidth_,
}: {
  actualField_: HTMLDivElement;
  makeFakeField_: () => HTMLElement;
  wrap_: boolean;
  bodyAlignmentSignal_: Signal<solid_JSX.CSSProperties>;
  backdropStyleSignal_: Signal<solid_JSX.CSSProperties>;
  setPollAlignment_: Setter<boolean>;
  buttonInField_: HTMLButtonElement;
  modalSearchFieldOuterWidth_: Accessor<number>;
}) {
  return createRoot(dispose => {
    const [innerWidthReactive, setInnerWidthReactive] = createSignal(innerWidth);
    const [innerHeightReactive, setInnerHeightReactive] = createSignal(innerHeight);
    const { left, top, width } = actualField_.getBoundingClientRect();
    const fakeField = makeFakeField_();
    const owner = getOwner();
    const inModalFieldWidth = createMemo(
      // Can't have `min(${modalSearchFieldOuterWidth_()}px, var(--field-max-width, 600px))` because the WAAPI doesn't support that, so we need ot calculate it in JS
      () =>
        Math.min(
          modalSearchFieldOuterWidth_(),
          parseFloat(getComputedStyle(actualField_).getPropertyValue("--field-max-width") || "600")
        )
    );
    const inModalFieldWidthPx = createMemo(() => inModalFieldWidth() + "px");
    let disableResizePollingTimeout: ReturnType<typeof setTimeout> | undefined;
    actualField_.replaceWith(fakeField);
    // Don't move the wrapped div since that would confuse run_in_root_or_auto_cleanup, but do actually move the field the user clicked around so that all selection stuff etc. is easier
    const addedToBody = wrap_
      ? ((<div class="depict plp search">{actualField_}</div>) as HTMLDivElement)
      : actualField_;
    document.body.append(addedToBody);
    const zIndexOfFake = getComputedStyle(fakeField).zIndex;
    Object.assign(addedToBody.style, {
      position: "fixed",
      top: top + "px",
      left: left + "px",
      width: width + "px",
      ...(zIndexOfFake !== "auto" ? { zIndex: +zIndexOfFake + 1 } : {}),
    });
    const absoluteFieldTop = createMemo(() => {
      innerHeightReactive();
      innerWidthReactive();
      // This is very semi-scientific but I hope it works (seems to, albeit laggy see comment where this value gets used)
      return fakeField.getBoundingClientRect().top;
    });
    const pxOffCenter = Math.abs(untrack(innerWidthReactive) / 2 - (left + width / 2));
    const openDuration_ = pxOffCenter > 100 ? 250 : 125; // faster animations if little left-right movement
    const closeDuration_ = pxOffCenter > 100 ? 150 : 100;
    setPollAlignment_(true);
    // Fade out submit button so there aren't two overlapping buttons for a split second
    if (pxOffCenter > 10) {
      buttonInField_.animate([{ opacity: 1 }, { opacity: 0 }], { duration: openDuration_ / 3, fill: "forwards" });
    }
    createEffect<boolean>(finished => {
      if (finished) return finished;
      if (!modalSearchFieldOuterWidth_()) return false;
      // Wait until the ResizeObserver has delivered a value in case that the modal is small or has much padding so we know that we can't animate our fake field to be wider than that
      addedToBody
        .animate(
          [
            {
              left: left + "px",
              width: width + "px",
            },
            {
              left: `${untrack(innerWidthReactive) / 2 - untrack(inModalFieldWidth) / 2}px`,
              width: untrack(inModalFieldWidthPx),
            },
          ],
          { duration: openDuration_, easing: "ease-in" }
        )
        .finished.then(() => {
          setPollAlignment_(false);
          runWithOwner(owner, () =>
            createEffect(() => {
              // When animation has finished, still dynamically set the size of the search field behind in case the user resizes the window
              Object.assign(addedToBody.style, {
                // This is left: 50%, transform: translateX(-50) with extra steps but when using it safari and firefox glitch out like crazy
                left: `${innerWidthReactive() / 2 - inModalFieldWidth() / 2}px`,
                width: inModalFieldWidthPx(),
                // Lord forgive me for this is laggy. Example: on preview browser when resizing the screen in both x and y direction at the sam time. But it's too hard to change the code now, so that it doesn't happen.
                // Basically we'd want one align_field running in only the y-axis on the field that's still in the DOM and another one in the x-axis on the fake field. Or something…
                top: absoluteFieldTop() + "px",
              });
              // We might only have changed the left position which align_field doesn't know about, make it poll the position for a while
              setPollAlignment_(true);
              if (disableResizePollingTimeout) {
                clearTimeout(disableResizePollingTimeout);
              }
              disableResizePollingTimeout = setTimeout(
                catchify(() => {
                  setPollAlignment_(false);
                  disableResizePollingTimeout = undefined;
                }),
                1000
              );
            })
          );
        });
      return true;
    }, false);
    onCleanup(() => {
      // If we get cleaned up, reset the state and cancel the timeout to make sure the timeout doesn't mess with the next animation
      clearTimeout(disableResizePollingTimeout);
      setPollAlignment_(false);
    });
    genericModalOpeningAnimations({ setBackdropStyle_, setBodyAlignment_, openDuration_ });

    onCleanup(() => {
      addedToBody.remove();
      fakeField.replaceWith(actualField_);
      setPollAlignment_(true);
      // Trigger a new alignment to make sure we are using the dimensions from the field being back in the DOM now, fixes https://depictaiworkspace.slack.com/archives/C06LVKNPLP5/p1710862260203749
      queueMacroTask(() => setPollAlignment_(false));
    });

    guaranteeAlignment(() => {
      setInnerWidthReactive(innerWidth);
      setInnerHeightReactive(innerHeight);
    });

    return async () => {
      const { width, left } = fakeField.getBoundingClientRect();
      // Just copy-pasted below line without thinking, it might be wrong
      const pxOffCenter = Math.abs(untrack(innerWidthReactive) / 2 - (left + width / 2));
      genericModalClosingAnimations({ setBackdropStyle_, setBodyAlignment_, closeDuration_ });
      await Promise.all([
        addedToBody.animate(
          [
            {
              width: untrack(inModalFieldWidthPx),
              left: `${untrack(innerWidthReactive) / 2 - untrack(inModalFieldWidth) / 2}px`,
            },
            {
              width: width + "px",
              left: left + "px",
            },
          ],
          { duration: closeDuration_, fill: "forwards", easing: "ease-out" }
        ).finished,
        buttonInField_.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: pxOffCenter > 10 ? closeDuration_ / 3 : 1,
          delay: closeDuration_ * (2 / 3),
          fill: "forwards",
        }).finished,
      ]);
      setPollAlignment_(false);

      dispose();
    };
  });
}
