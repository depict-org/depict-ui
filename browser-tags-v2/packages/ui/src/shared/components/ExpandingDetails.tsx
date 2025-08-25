/** @jsxImportSource solid-js */
import { createEffect, createMemo, createSignal, JSX as solid_JSX, Signal, untrack } from "solid-js";
import { insert } from "solid-js/web";
import { catchify, observer } from "@depict-ai/utilishared";
import { useExpandingContainerReactive } from "../helper_functions/expanding_container_with_reactive_kids";

const has_new_animate = /*@__PURE__*/ supports_partial_keyframes();

export function ExpandingDetails(props: {
  details_: HTMLDetailsElement;
  summary_: HTMLElement;
  children: solid_JSX.Element | (() => solid_JSX.Element);
  is_open_: Signal<boolean>;
  duration_?: number;
  delay_?: number;
  dont_animate_if_instant_open_?: boolean;
}) {
  let fresh_component = true;
  let timeout_started = false;
  const { details_, summary_, children, duration_, delay_, dont_animate_if_instant_open_ = true } = props;
  const { expand, ExpandingContainer, collapse } = useExpandingContainerReactive({
    duration: duration_ ?? 250,
    delay: delay_ ?? 0,
  });
  const [is_in_dom, set_is_in_dom] = createSignal(document.documentElement.contains(details_));
  // we want this extra layer for if the props.is_open_ function changes itself but not the value of the signal. If we re-run below effect it flickers sometimes for some reason
  const is_open_memo = createMemo(() => props.is_open_[0]());
  const toggle = () => props.is_open_[1](!untrack(is_open_memo));
  insert(details_, [summary_, <ExpandingContainer>{children}</ExpandingContainer>], null);

  if (!untrack(is_in_dom)) {
    observer.wait_for_element(details_).then(catchify(() => set_is_in_dom(true)));
  }

  createEffect(
    catchify(async () => {
      const is_open = is_open_memo();
      if (!is_in_dom()) {
        // wait with setting state until we're in DOM, animation won't work otherwise
        return;
      }
      if (dont_animate_if_instant_open_ && fresh_component && !timeout_started) {
        timeout_started = true;
        setTimeout(catchify(() => (fresh_component = false)));
      }

      if (is_open) {
        details_.open = true; // open up the toggle so the animation can happen
        const do_duration =
          dont_animate_if_instant_open_ && fresh_component
            ? has_new_animate
              ? 0
              : 1 /* if the zero duration is 1 modern chrome will paint a frame with unexpanded and then one with expanded which doesn't look nice, if you have 0 on older browsers they won't play the animation at all (i.e. iOS 12.5.5) */
            : duration_;
        await expand(0, do_duration);
      } else {
        const animation = await collapse();

        animation?.addEventListener(
          "finish",
          catchify(() => (details_.open = false))
          // this line causes a chrome bug in rare instances, see: https://bugs.chromium.org/p/chromium/issues/detail?id=1404121#c2
          // but since it's too hard to reproduce it's ok to leave it in
          // linear issue:
          // https://linear.app/depictai/issue/FRO-413/on-estoreno-the-browser-crashes-when-expandingcollapsing-filtre-on
        );
      }
    })
  );

  details_.addEventListener(
    "toggle",
    catchify(() => {
      const { open } = details_;
      if (open !== untrack(() => props.is_open_[0]())) {
        // diffing here since the two items in is_open might be setters and getters that aren't part of one signal like in CheckboxHierarchicalFilter
        props.is_open_[1](open);
      }
    }) // in case someone somehow toggles it without us intercepting it at least follow suit
  );

  summary_.addEventListener(
    "click",
    catchify(ev => {
      ev.preventDefault();
      toggle();
    })
  );
  summary_.addEventListener(
    "keydown",
    catchify(ev => {
      const { key } = ev;
      if (key === "Enter" || key === " ") {
        ev.preventDefault();
        toggle();
      }
    })
  );

  return details_;
}

export function supports_partial_keyframes() {
  try {
    document.createElement("b").animate({ opacity: [0] });
    return true;
  } catch (e) {
    return false;
  }
}
