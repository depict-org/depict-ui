/** @jsxImportSource solid-js */
import { Accessor, createEffect, JSX as solid_JSX, on, onCleanup, Signal, untrack } from "solid-js";
import { buildThresholdList, catchify } from "@depict-ai/utilishared";

/**
 * Function used in SearchModal to accomplish that "the modal always has at least 10vh space below it", regardless of top positioning (IIRC). I couldn't accomplish this scaleably with CSS
 * @param el The scrolling element in the search modal (.padded) to keep track of
 * @param style_props a signal to change the styling of el
 * @param bottom_distance optional, the bottom distance from 0-1 where 1 is 100vh space below and 0 is 0vh space below. 0.1 is the default
 */
export function set_max_height_based_on_bottom_distance(
  el: HTMLElement,
  [get_style_props, set_style_props]: Signal<solid_JSX.CSSProperties>,
  bottom_distance?: Accessor<number | undefined>
) {
  const overflow_style_beginning = "position:absolute;z-index:-1;pointer-events:none;width:100%;height:200%;";
  const upper_overflowing_box = (<div style={overflow_style_beginning + "top:-100%;"} />) as HTMLDivElement;
  const lower_overflowing_box = (<div style={overflow_style_beginning} />) as HTMLDivElement;
  const do_positioning = () => {
    const windowHeight = innerHeight;
    const new_value = `${
      windowHeight -
      el.parentElement!.getBoundingClientRect().top -
      windowHeight * ((bottom_distance ? untrack(bottom_distance) : undefined) ?? 0.1)
    }px`;
    const key = "max-height";
    const old_value = untrack(get_style_props);
    if (old_value[key] !== new_value) {
      set_style_props({
        ...old_value,
        [key]: new_value,
      });
    }
  };
  const is = new IntersectionObserver(
    catchify(_records => {
      do_positioning();
    }),
    { threshold: buildThresholdList(100) }
  );
  is.observe(upper_overflowing_box);
  is.observe(lower_overflowing_box);
  onCleanup(() => is.disconnect());
  el.after(upper_overflowing_box, lower_overflowing_box);

  if (bottom_distance) {
    createEffect(on(bottom_distance, do_positioning, { defer: true }));
  }
}
