import { make_asyncIterable_exiter } from "../utilities/infinite_promise/make_asynciterable_exitable";
import { observer } from "../element-observer";
import { catchify } from "../logging/error";
import { iterable_to_elems } from "../utilities/infinite_promise/iterable_to_elems";
import { IPNS } from "../utilities/infinite_promise/async_iterable_ipns";

export async function GeneralSideSlidein({
  title_,
  children,
  CloseIcon,
}: {
  title_: IPNS<string>;
  children: HTMLElement | HTMLElement[];
  CloseIcon: () => HTMLElement | SVGElement;
}) {
  // TODO: make so once can't accidentally have multiple at once
  let close_: VoidFunction;
  const open_promise = new Promise<void>(r => (close_ = r));
  const body = await observer.wait_for_element("body");
  const backdrop = (<div class="slidein-backdrop" onClick={close_!} />) as HTMLDivElement;
  const [exit_title_iterator, exitable_title_iterator] = make_asyncIterable_exiter(title_);
  const closing_handlers: VoidFunction[] = [exit_title_iterator];
  const slidein = (
    <div class="slidein">
      <div class="header">
        <span class="title">{iterable_to_elems(exitable_title_iterator, false)}</span>
        <button class="close minor" onClick={close_!}>
          {CloseIcon()}
        </button>
      </div>
      <div class="body">{children}</div>
    </div>
  ) as HTMLDivElement;
  const elements_in_container = (
    <div class="depict">
      {backdrop}
      {slidein}
    </div>
  ) as HTMLDivElement;
  body.append(elements_in_container);
  backdrop.animate({ opacity: [0, 1] }, { easing: "ease-in", duration: 260 });
  slidein.animate(
    { transform: ["translateX(50%) scaleX(0.6)", "translateX(0) scaleX(1)"], opacity: [0, 1] },
    { easing: "ease-in", duration: 220 }
  );

  const handler = catchify(({ key }: KeyboardEvent) => {
    if (key === "Escape") {
      // make pressing escape close the slidein
      close_();
    }
  });
  window.addEventListener("keydown", handler);
  open_promise.then(
    catchify(() => {
      window.removeEventListener("keydown", handler);
      backdrop.animate({ opacity: [1, 0] }, { easing: "ease-out", duration: 200, fill: "forwards" });
      slidein
        .animate(
          { transform: ["translateX(0) scaleX(1)", "translateX(50%) scaleX(0.6)"], opacity: [1, 0] },
          { easing: "ease-out", duration: 220 }
        )
        .addEventListener(
          "finish",
          catchify(() => {
            elements_in_container.remove();
            closing_handlers.forEach(handler => handler());
          })
        );
    })
  );

  return { close_: close_!, on_close_: (fn: VoidFunction) => closing_handlers.push(fn) };
}
