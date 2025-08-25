import { createSignal, JSX as solid_JSX, Setter } from "solid-js";
import { ModalAlignmentSignals } from "./align_field";

/**
 * Modal opening animations that always should be played for the SearchModalV2
 */
export function genericModalOpeningAnimations({
  setBackdropStyle_,
  setBodyAlignment_,
  openDuration_,
}: {
  setBackdropStyle_: Setter<solid_JSX.CSSProperties>;
  setBodyAlignment_: Setter<solid_JSX.CSSProperties>;
  openDuration_: number;
}) {
  setBackdropStyle_(prev => ({ ...prev, opacity: 0, transition: `opacity ${openDuration_}ms ease-in` }));
  requestAnimationFrame(() => setBackdropStyle_(prev => ({ ...prev, opacity: 1 })));
  setBodyAlignment_(prev => ({
    ...prev,
    opacity: 0,
    transition: `opacity ${openDuration_}ms ease-in ${openDuration_ / 5}ms`, // Add a slight delay so the brightness of the modal isn't so jarring before the background has gotten darkened
    "--js-animation-duration": `${openDuration_}ms`,
  }));
  requestAnimationFrame(() => setBodyAlignment_(prev => ({ ...prev, opacity: 1 })));
}

/**
 * Modal closing animations that always should be played for the SearchModalV2
 */
export function genericModalClosingAnimations({
  setBackdropStyle_,
  setBodyAlignment_,
  closeDuration_,
}: {
  setBackdropStyle_: Setter<solid_JSX.CSSProperties>;
  setBodyAlignment_: Setter<solid_JSX.CSSProperties>;
  closeDuration_: number;
}) {
  setBackdropStyle_(prev => ({ ...prev, opacity: 0, transition: `opacity ${closeDuration_}ms ease-out` }));
  setBodyAlignment_(prev => ({ ...prev, opacity: 0, transition: `opacity ${closeDuration_}ms ease-out` }));
}

export function setupDefaultAnimations(alignmentSignals: ModalAlignmentSignals, modalVersion: 1 | 2) {
  const [, setBodyAlignment_] = alignmentSignals.body_;
  const [, setBackdropStyle_] = alignmentSignals.backdrop_ || createSignal({});
  // For default centered modal, also run our fading animations if search modal v2
  modalVersion === 2 &&
    genericModalOpeningAnimations({
      openDuration_: 125,
      setBodyAlignment_,
      setBackdropStyle_,
    });
  const closingAnimation =
    modalVersion === 2
      ? async () => {
          genericModalClosingAnimations({
            closeDuration_: 100,
            setBodyAlignment_,
            setBackdropStyle_,
          });
          await new Promise(r => setTimeout(r, 100));
        }
      : undefined;
  return closingAnimation;
}
