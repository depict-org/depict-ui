/** @jsxImportSource solid-js */
import { Accessor, createComputed, createEffect, createMemo, createSignal, Signal } from "solid-js";
import { catchify } from "@depict-ai/utilishared";
import { SolidFormatPrice } from "../helper_functions/solid_format_price";
import { solid_plp_shared_i18n } from "../../locales/i18n_types";
import { on_viewport_move } from "../helper_functions/on_viewport_move";
import { isServer } from "solid-js/web";

export function ScrollStatus({
  formatted_number_of_results_,
  first_result_in_viewport_: [get_first_result_in_viewport],
  last_result_in_viewport_: [get_last_result_in_viewport],
  number_of_results_,
  i18n_: { price_formatting_, of_ },
  get_scroll_position_ = () => scrollY,
  listen_to_scroll_on_,
  velocity_too_fast_ = 1.5,
}: {
  first_result_in_viewport_: Signal<number | undefined>;
  last_result_in_viewport_: Signal<number | undefined>;
  formatted_number_of_results_: Accessor<string>;
  number_of_results_: Accessor<undefined | number>;
  i18n_: solid_plp_shared_i18n;
  get_scroll_position_?: () => number;
  listen_to_scroll_on_?: Element;
  velocity_too_fast_?: number;
}) {
  if (isServer) return; // won't show in initial render and need scroll position

  const [first_to_show, set_first_to_show] = createSignal<number>(0);
  const [last_to_show, set_last_to_show] = createSignal<number>(0);
  const [count_to_show, set_count_to_show] = createSignal<string>("");
  const [permitted_to_show, set_permitted_to_show] = createSignal(false); // due to scroll speed
  const [show_triggered, set_show_triggered] = createSignal(false); // signal to just switch between true/false to trigger a new animation which will persist the indicator
  const [times_too_fast, set_times_too_fast] = createSignal(0);
  const modified_price_formatting_ = createMemo(() => ({ ...price_formatting_(), places_after_comma_: 0 }));
  let element: HTMLDivElement;
  let animation: undefined | Animation;
  let last_pos_time = +new Date();
  let last_pos = get_scroll_position_();
  let unpermit_when_possible = false;

  const handle_scrollpos_change = () => {
    if (animation) {
      set_show_triggered(prev => !prev); // make sure that once we've decided to show the indicator it doesn't disappear before we stop scrolling
    }
    const distance_travelled = Math.abs(get_scroll_position_() - last_pos);
    const now = +new Date();
    const age_of_distance = now - last_pos_time;
    const velocity = distance_travelled / age_of_distance; // pixels per millisecond
    if (velocity > velocity_too_fast_) {
      set_times_too_fast(prev => prev + 1);
      setTimeout(() => set_times_too_fast(prev => prev - 1), 1000);
    }
    last_pos_time = now;
    last_pos = get_scroll_position_();
  };
  on_viewport_move(handle_scrollpos_change, undefined, listen_to_scroll_on_);

  createComputed(() => {
    // We need to set this reactively to ensure that it's forbidden to show even when times_too_fast has tapered off after a few seconds, see https://github.com/depict-org/depict/pull/82
    if (times_too_fast() > 10) {
      set_permitted_to_show(true);
      unpermit_when_possible = false;
    } else {
      if (animation) {
        unpermit_when_possible = true;
      } else {
        set_permitted_to_show(false);
      }
    }
  });

  createEffect(() => {
    show_triggered();
    const first = get_first_result_in_viewport();
    const last = get_last_result_in_viewport();
    const count = formatted_number_of_results_();
    const allowed = permitted_to_show();
    const should_show =
      first !== undefined && // we have gotten intersection data for first
      last !== undefined && // we have gotten intersection data for last
      Math.abs(first) !== Infinity && // first isn't infinity due to some division stuff (happened for me once)
      Math.abs(last) !== Infinity && // last isn't infinity due to some division stuff (happened for me once)
      !(first === 0 && last === 0) && // there aren't zero elements (I think is what this checks)
      count && // we have a string with formatted number of results, it might take "time" for this to arrive and we don't want to show garbage in the meantime
      number_of_results_()! >= 10; // at least 10 results

    if (!should_show || !allowed) {
      return;
    }
    // don't show invalid values - just let the last ones fade away
    set_first_to_show(first);
    set_last_to_show(last);
    set_count_to_show(count);
    const duration = 1500;
    const faded_in_offset = 0.02;
    // animation stuff
    if (animation) {
      // reset animation to just after we became visible
      const in_time = 1500 * 0.02 * 6;
      if (animation.currentTime! > in_time) {
        animation.currentTime = in_time;
      }
      // the six is a correction factor for my macbook (maybe also everywhere else) where I don't understand why I can't calculate the time of the first keyframe without it
      return;
    }
    element.style.display = "";
    animation = element.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: faded_in_offset },
        { opacity: 1, offset: 0.6 },
        { opacity: 0, offset: 1 },
      ],
      { duration: duration, fill: "forwards", easing: "ease-in-out" }
    );
    animation.addEventListener(
      "finish",
      catchify(() => {
        if (unpermit_when_possible) {
          set_permitted_to_show(false);
        }
        animation = undefined;
        element.style.display = "none";
      })
    );
  });

  return (
    <div class="scroll-status" style="display:none" ref={element!}>
      <span class="text">
        <b>
          <SolidFormatPrice price_={first_to_show()} price_formatting_={modified_price_formatting_()} />
        </b>{" "}
        –{" "}
        <b>
          <SolidFormatPrice price_={last_to_show()} price_formatting_={modified_price_formatting_()} />
        </b>{" "}
        {of_()} <b>{count_to_show()}</b>
      </span>
    </div>
  );
}
