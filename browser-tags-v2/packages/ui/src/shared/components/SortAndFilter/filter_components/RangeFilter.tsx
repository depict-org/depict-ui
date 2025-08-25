/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  JSX as solid_JSX,
  onCleanup,
  Setter,
  Signal,
  untrack,
} from "solid-js";
import { RangeFilterMeta, SearchFilter } from "@depict-ai/types/api/SearchResponse";
import { catchify } from "@depict-ai/utilishared";
import { SolidFormatPrice } from "../../../helper_functions/solid_format_price";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";

/**
 * Renders a filter that is a range slider, commonly used for the price filter
 */
export function RangeFilter({
  filter_,
  selected_filters_,
  i18n_,
  filter_query_,
}: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<{ field: string; op: string; data: any }[]>;
  i18n_: solid_plp_shared_i18n;
  view_more_button_below_group_: Signal<solid_JSX.Element>;
  filter_query_?: Accessor<string | undefined>;
}) {
  // If you ever attempt to implement that one can drag one range "knob" over the other like on prisjakt, see https://gitlab.com/depict-ai/depict.ai/-/merge_requests/8458/diffs?commit_id=c52dbdd15ca073489bee138b15d27bb6bf2992df
  // The issue with it is that one wants to discard the changes to the lower value as soon as the lower value has become the upper value when dragging the initially lower knob over the initially upper knob
  // But we can't reliably know when we've started dragging/changing the value (or at least I gave up at that point for now)
  const defaultRange = createMemo(() => {
    const { data } = filter_();
    if (data) return data as [number, number];
    const { min, max } = filter_().meta as RangeFilterMeta;
    return [min, max] as [number, number];
  });
  const current_range = createSignal<[number, number]>(untrack(defaultRange));
  const selected_filter = createMemo(() =>
    selected_filters_[0]().find(
      ({ field: checking_field, op: checking_op }) => checking_field === filter_().field && checking_op === filter_().op
    )
  );
  let debounce_timeout: ReturnType<typeof setTimeout>;
  onCleanup(() => clearTimeout(debounce_timeout));

  createComputed(() => {
    const defined_filter_data = selected_filter()?.data;
    const default_data = defaultRange();
    if (Array.isArray(defined_filter_data)) {
      current_range[1](defined_filter_data as [number, number]);
    } else {
      current_range[1](default_data as [number, number]);
    }
  });

  createComputed(() => {
    clearTimeout(debounce_timeout);
    debounce_timeout = setTimeout(
      catchify((range: [number, number]) =>
        untrack(() => {
          const default_data = defaultRange();
          const filter_object = {
            op: filter_().op,
            field: filter_().field,
            data: range,
          };
          const set_filter = selected_filter();
          const selected_filters = [...selected_filters_[0]()];
          const has_default_data = (default_data as Partial<number[]>).every((item, index) => range[index] === item); // if we just have the default data, don't write it to the filters since then it's hard to know if filters are set or not (whether to show clear button or not)
          const has_changed = set_filter?.data[0] !== range[0] || set_filter?.data[1] !== range[1];
          let modified_filters_array = false;
          if (set_filter && (has_changed || has_default_data)) {
            selected_filters.splice(selected_filters.indexOf(set_filter), 1);
            modified_filters_array = true;
          }
          if (!has_default_data && has_changed) {
            // we don't need to check .length too right?
            selected_filters.push(filter_object);
            modified_filters_array = true;
          }
          if (modified_filters_array) {
            selected_filters_[1](selected_filters);
          }
        })
      ),
      300,
      current_range[0]()
    );
  });

  return (
    <RangeSelector
      i18n_={i18n_}
      price_formatting_={i18n_.price_formatting_}
      current_range_={current_range}
      min_={createMemo(() => (filter_().meta as RangeFilterMeta).min)}
      max_={createMemo(() => (filter_().meta as RangeFilterMeta).max)}
    />
  );
}

function RangeSelector({
  max_,
  min_,
  current_range_,
  price_formatting_,
  i18n_,
}: {
  min_: Accessor<number>;
  max_: Accessor<number>;
  current_range_: Signal<[number, number]>;
  i18n_: solid_plp_shared_i18n;
  price_formatting_: Accessor<{
    pre_: string;
    post_: string;
    decimal_places_delimiter_: string;
    thousands_delimiter_: string;
    places_after_comma_: number | "auto";
  }>;
}) {
  let price_input_1: HTMLInputElement;
  let price_input_2: HTMLInputElement;
  const [get_current_range] = current_range_;

  const pre_price = createMemo(() => price_formatting_().pre_);
  const post_price = createMemo(() => price_formatting_().post_);
  const should_be_disabled_ = createMemo(() => Math.abs(min_() - max_()) < 2);

  return (
    <div class="range" classList={{ disabled: min_() === max_() }}>
      <div class="input-group">
        <div class="field">
          <input
            disabled={should_be_disabled_()}
            type="number"
            aria-label={i18n_.range_filter_low_point_aria_label_()}
            min={min_()}
            max={max_()}
            value={get_current_range()[0]}
            onBlur={catchify(() => set_range_with_sanitation(min_, max_, current_range_, 0, price_input_1))}
            onKeyDown={catchify(({ key }: KeyboardEvent) => {
              if (key === "Enter") {
                set_range_with_sanitation(min_, max_, current_range_, 0, price_input_1);
              }
            })}
            ref={price_input_1!}
          />
        </div>
        <div class="separator">-</div>
        <div class="field">
          <input
            disabled={should_be_disabled_()}
            aria-label={i18n_.range_filter_high_point_aria_label_()}
            type="number"
            min={min_()}
            max={max_()}
            value={get_current_range()[1]}
            onBlur={catchify(() => set_range_with_sanitation(min_, max_, current_range_, 1, price_input_2))}
            onKeyDown={catchify(({ key }: KeyboardEvent) => {
              if (key === "Enter") {
                set_range_with_sanitation(min_, max_, current_range_, 1, price_input_2);
              }
            })}
            ref={price_input_2!}
          />
        </div>
      </div>
      <ExponentialSlider
        max_={max_}
        min_={min_}
        current_range_={current_range_}
        i18n_={i18n_}
        should_be_disabled_={should_be_disabled_}
      />
      <div class="value-text">
        <span class="min">
          {pre_price()}
          <SolidFormatPrice price_={min_()} price_formatting_={price_formatting_()} />
          {post_price()}
        </span>
        <span class="max">
          {pre_price()}
          <SolidFormatPrice price_={max_()} price_formatting_={price_formatting_()} />
          {post_price()}
        </span>
      </div>
    </div>
  );
}

function ExponentialSlider({
  current_range_,
  min_,
  i18n_,
  max_,
  should_be_disabled_,
}: {
  min_: Accessor<number>;
  i18n_: solid_plp_shared_i18n;
  max_: Accessor<number>;
  current_range_: Signal<[number, number]>;
  should_be_disabled_: Accessor<boolean>;
}) {
  // inspired by https://observablehq.com/@mbostock/nonlinear-slider
  const transform_linear_to_nonlinear = ([smaller, larger]: [number, number]) =>
    [Math.sqrt(smaller), Math.sqrt(larger)] as [number, number];
  const [read_current_range, write_current_range] = current_range_;
  const modified_range_accessor = createMemo(() => transform_linear_to_nonlinear(read_current_range()));
  const modified_max = createMemo(() => Math.sqrt(max_()));
  const modified_min = createMemo(() => Math.sqrt(min_()));
  const offset_value_calculator_ = (value: number, how_many: number) => {
    const number_in_linear = value * value;
    const changed = number_in_linear + how_many;
    return Math.sqrt(changed);
  };
  const convert_back = (smaller: number, larger: number) =>
    [Math.round(smaller * smaller), Math.round(larger * larger)] as [number, number];

  const modified_range_setter = ((
    new_range_or_function: [number, number] | ((old_value: [number, number]) => [number, number])
  ) => {
    const old_range = untrack(modified_range_accessor);
    const new_range =
      typeof new_range_or_function === "function" ? new_range_or_function(old_range) : new_range_or_function;
    const [smaller, larger] = new_range;
    const [old_smaller, old_larger] = old_range;
    const new_range_converted = convert_back(smaller, larger);
    const old_range_converted = convert_back(old_smaller, old_larger);

    if (new_range_converted[0] === old_range_converted[0] && new_range_converted[1] === old_range_converted[1]) {
      // If the new value gets identical rounding errors to the old value when being converted back, don't write it to the signal since it would cause an infinite loop
      return new_range;
    }

    write_current_range(new_range_converted);

    return new_range;
  }) as Setter<[number, number]>;

  return LinearSlider({
    current_range_: [modified_range_accessor, modified_range_setter], // "Lie" to the actual slider so we don't have to implement exponential handling in there
    min_: modified_min,
    max_: modified_max,
    offset_value_calculator_,
    i18n_,
    should_be_disabled_,
  });
}

function LinearSlider({
  max_,
  min_,
  current_range_,
  offset_value_calculator_,
  i18n_,
  should_be_disabled_,
}: {
  i18n_: solid_plp_shared_i18n;
  min_: Accessor<number>;
  max_: Accessor<number>;
  current_range_: Signal<[number, number]>;
  offset_value_calculator_: (value: number, how_many: number) => number;
  should_be_disabled_: Accessor<boolean>;
}) {
  let range_input_1: HTMLInputElement;
  let range_input_2: HTMLInputElement;
  let clickable_slider: HTMLDivElement;

  const [get_current_range, set_current_range] = current_range_;

  const progress_styling = createMemo(() => {
    const min = min_();
    const span = max_() - min;
    const [start, end] = get_current_range();

    if (should_be_disabled_()) {
      return `left:50%;right:50%`;
    }

    return `left:${((start - min) / span) * 100}%;right:${100 - ((end - min) / span) * 100}%`;
  });

  const set_value = (el: HTMLInputElement, index: 0 | 1) => {
    // initially I set the value on the elements by just having value={get_current_range()[0]}
    // the issue with that is that we sometimes need to set the value to an invalid range (i.e. sometimes when navigating backwards and forwards)
    // if we do that, the browser will change el.value to fit withing min and max and then once min and max have updated (they update later, when we have an api response, while value updates instantly from history.state) el.value will be different from the solid signal that set it
    // with this "workaround" we ensure that el.value matches the solid signal closer
    createEffect(() => {
      min_();
      max_();
      el.value = get_current_range()[index] as unknown as string;
    });
  };

  return (
    <>
      <div
        class="slider"
        ref={clickable_slider!}
        onClick={catchify((e: MouseEvent) => {
          const rect = clickable_slider.getBoundingClientRect();
          const slider_beginning_left = rect.left;
          const slider_width = rect.width;
          const click_from_left_in_slider = e.clientX - slider_beginning_left; // both of these value contain scroll position so this should work regardless of horisontal scroll if there is any
          const place_of_click_in_percent = (click_from_left_in_slider / slider_width) * 100;
          const one_percent_of_range = (max_() - min_()) / 100;
          const place_of_click = min_() + one_percent_of_range * place_of_click_in_percent;
          const [lower, upper] = get_current_range();
          const distance_to_lower_point = Math.abs(place_of_click - lower);
          const distance_to_upper_point = Math.abs(upper - place_of_click);

          if (distance_to_lower_point < distance_to_upper_point) {
            set_current_range([place_of_click, upper]);
          } else {
            set_current_range([lower, place_of_click]);
          }
        })}
      >
        <div class="progress" style={progress_styling()}></div>
      </div>
      <div class="range-group">
        <input
          disabled={should_be_disabled_()}
          type="range"
          aria-label={i18n_.range_filter_low_point_aria_label_()}
          min={min_()}
          max={max_()}
          value={createMemo(
            () => {
              min_();
              max_();
              return get_current_range()[0];
            },
            undefined,
            { equals: false }
          )()}
          step="any"
          onInput={catchify(() =>
            set_range_with_sanitation(min_, max_, current_range_, 0, range_input_1, offset_value_calculator_)
          )}
          ref={el => {
            range_input_1 = el;
            set_value(range_input_1, 0);
          }}
        />
        <input
          disabled={should_be_disabled_()}
          aria-label={i18n_.range_filter_high_point_aria_label_()}
          type="range"
          min={min_()}
          max={max_()}
          step="any"
          onInput={catchify(() =>
            set_range_with_sanitation(min_, max_, current_range_, 1, range_input_2, offset_value_calculator_)
          )}
          ref={el => {
            range_input_2 = el;
            set_value(range_input_2, 1);
          }}
        />
      </div>
    </>
  );
}

function set_range_with_sanitation(
  min_: Accessor<number>,
  max_: Accessor<number>,
  current_range_signal: Signal<[number, number]>,
  index: number,
  target_el: HTMLInputElement,
  get_offset_value = (value: number, how_many: number) => value + how_many
) {
  let value_as_number = +target_el.value;
  const min = untrack(() => min_());
  const max = untrack(() => max_());
  const too_small = value_as_number < min;
  const too_big = value_as_number > max;
  const current_range = untrack(current_range_signal[0]);
  const [current_lower, current_upper] = current_range;
  if (index === 0 && value_as_number >= current_upper) {
    target_el.value = (value_as_number = get_offset_value(current_upper, -1)) as unknown as string;
  } else if (index === 1 && value_as_number <= current_lower) {
    target_el.value = (value_as_number = get_offset_value(current_lower, 1)) as unknown as string;
  } else if (too_small || too_big) {
    target_el.value = (value_as_number = too_small ? min : max) as unknown as string;
  }
  const new_value = [...current_range];
  new_value[index] = value_as_number;
  current_range_signal[1](new_value as [number, number]);
}
