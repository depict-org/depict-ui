/** @jsxImportSource solid-js */
import { createSignal, JSX as solid_JSX } from "solid-js";
import { catchify, observer } from "@depict-ai/utilishared";

const closing_functions = /*@__PURE__*/ new Set<VoidFunction>();

export const is_showing_toast = /*@__PURE__*/ createSignal(false);

export function show_toast({
  children,
  on_close_,
  close_after_,
  ...more_attributes
}: {
  children?: solid_JSX.Element;
  close_after_: number;
  on_close_?: VoidFunction;
} & solid_JSX.HTMLAttributes<HTMLDivElement>) {
  let close_toast_: VoidFunction;
  const stay_open_promise = new Promise<void>(r => (close_toast_ = r));

  catchify(async () => {
    const closing_animation_duration = 300; // ms
    const element = (<div {...more_attributes}>{children}</div>) as HTMLDivElement;
    const [, set_is_showing_toast] = is_showing_toast;
    // if this is a memory leak the garbage collector is stupid - does someone know?
    for (const ev of ["pointerover", "focusin"]) {
      element.addEventListener(
        ev,
        catchify(() => closing_animation.pause())
      );
    }
    for (const ev of ["pointerout", "focusout"]) {
      element.addEventListener(
        ev,
        catchify(() => closing_animation.play())
      );
    }
    const body = await observer.wait_for_element("body");
    const x_translate = "translateX(-50%) ";
    let remove_keyboard_listener: VoidFunction;
    let had_toast_before = false;
    element.classList.add("depict", "toast", "plp");
    if (closing_functions.size) {
      // ensure we can never have multiple toasts open at the same time
      for (const fn of closing_functions) {
        fn();
      }
      had_toast_before = true;
    }
    body.append(element);
    // open toast
    element.animate(
      { opacity: [0, 1], transform: [x_translate + "translateY(100%)", x_translate + "translateY(0)"] },
      {
        easing: "ease-in",
        duration: 150,
        fill: "forwards",
        delay: had_toast_before ? 100 : 0 /* give old toasts a chance to animate closed */,
      }
    );
    // let other toasts close us if they open while we're still here
    closing_functions.add(close_toast_);
    set_is_showing_toast(true);
    const handler = catchify(({ key }: KeyboardEvent) => {
      if (key === "Escape") {
        // make pressing escape close the toast
        close_toast_();
      }
    });
    window.addEventListener("keydown", handler);
    remove_keyboard_listener = () => window.removeEventListener("keydown", handler);

    // this is both a very precise timeout for closing the modal (animations are much more precise than timeouts) and an animation letting the user know when it will close
    const closing_animation = element.animate(
      {
        borderImageWidth: ["0 0% 2px 0", "0 100% 2px 0"],
      },
      { duration: close_after_, fill: "forwards" }
    );
    closing_animation.addEventListener("finish", close_toast_!, { once: true });
    // wait until we should close - stay_open_promise is resolved by something
    await stay_open_promise;
    // start closing animation and wait for it to finish
    await new Promise(r =>
      element
        .animate(
          { opacity: [1, 0], transform: [x_translate + "translateY(0)", x_translate + "translateY(100%)"] },
          { easing: "ease-out", duration: closing_animation_duration, fill: "forwards" }
        )
        .addEventListener("finish", r, { once: true })
    );
    // remove elements and cleanup
    element.remove();
    closing_functions.delete(close_toast_!);
    if (!closing_functions.size) {
      set_is_showing_toast(false);
    }
    on_close_?.();
    remove_keyboard_listener!();
  })();
  return { close_toast_: close_toast_! };
}
