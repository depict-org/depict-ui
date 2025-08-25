/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  Index,
  JSX as solid_JSX,
  onCleanup,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { catchify, hex_to_rgb, relative_luminance_from_rgb, report } from "@depict-ai/utilishared";
import { Checkbox } from "./Checkbox";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { useExpandingContainerReactive } from "../../../helper_functions/expanding_container_with_reactive_kids";
import { ExpandCollapseFilter } from "../ExpandCollapseFilter";
import { to_lower_case_if_possible } from "../../../helper_functions/to_lower_case_if_possible";
import { HighlightTextInSpan } from "../../../../search/components/HighlightTextInSpan";

const max_visible_without_collapsing = 30;
const show_non_collapsible_when_collapsed = 8;

/**
 * Renders the color filter where you can see the actual color in the checkbox
 */
export function CheckboxColor({
  filter_,
  selected_filters_: [get_selected_filters, set_selected_filters],
  i18n_,
  view_more_button_below_group_: [, set_view_more_button_below_group_],
  filter_query_,
}: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<SearchFilter[]>;
  i18n_: solid_plp_shared_i18n;
  view_more_button_below_group_: Signal<solid_JSX.Element>;
  filter_query_?: Accessor<string | undefined>;
}) {
  // same as in CheckboxFilter, maybe we should make this DRY at some point
  const existing_filter = createMemo(() => {
    const { field, op } = filter_();

    return get_selected_filters().find(
      ({ field: checking_field, op: checking_op }) => checking_field === field && checking_op === op
    );
  });
  let form: HTMLFormElement;
  const checkboxes = createMemo(() => {
    const meta = filter_().meta as ValuesFilterMeta;

    return meta.values.map((value_, index) => {
      return {
        value_,
        name_: meta.names?.[index],
        count_: meta.counts?.[index],
        swatch_: meta.swatches?.[index],
      } as const;
    });
  });
  const backendFilterV2 = createMemo(() => "swatches" in (filter_().meta || {}));

  const render_checkbox = (
    checkbox: Accessor<{
      value_: string | number | [number, number] | [number, string] | [string, number] | [string, string];
      name_: string | undefined;
      count_: number | undefined;
      /**
       * In new backend format, when not falsey a string containing any valid value for the css `background` property
       */
      swatch_?: string | null;
    }>
  ) => {
    const hex_color = createMemo(() => {
      if (backendFilterV2()) {
        return checkbox().swatch_ || "#000";
      }
      return (checkbox().value_ as string).split(";")?.[1] || "";
    });
    const hasGradientOrOtherValidNonHexColor = createMemo(() => {
      const color = hex_color();
      return !!color && !color.startsWith("#");
    });
    const setBlackCheckClass = createMemo(() => {
      // Set this to true if we should show a black tick in the checkbox for better contrast on light backgrounds
      if (hasGradientOrOtherValidNonHexColor()) return false;
      const rgb_color = hex_to_rgb(hex_color());
      if (!rgb_color) return false;
      return does_black_contrast_better(rgb_color);
    });
    const is_checked = createMemo(() => {
      const data = existing_filter()?.data as undefined | (string | number | number[])[];
      const value = to_lower_case_if_possible(checkbox().value_);

      return !!data?.some(item => to_lower_case_if_possible(item) === value);
    });
    const value = createMemo(() => checkbox().value_);
    const label_text = createMemo(() => checkbox().name_ || value() + "");
    const count = createMemo(() => checkbox().count_);
    const colorNameDatasetValue = createMemo(() => {
      if (backendFilterV2()) {
        return label_text();
      }
      return (checkbox().value_ as string).split(";")?.[0] || "";
    });

    const input_row = (
      <Checkbox
        value_={value()}
        label_={
          // Don't show highlighted text when disabled because a) it's confusing and b) the highlighting color messed up the disableing color
          <Show when={count() !== 0} fallback={label_text()}>
            <HighlightTextInSpan whole_text_to_display_={label_text} searching_for_value_={() => filter_query_?.()} />
          </Show>
        }
        count_={count()}
        checked_={is_checked()}
        custom_indicator_ref={span => {
          const { classList, style } = span;
          classList.add("color");
          createRenderEffect(
            () => (style.background = hex_color() || "black") // default to black background so that the default-checkmark also is visible on dark page backgrounds (the or here can be removed when we fully go v2)
          );
          createRenderEffect(() => (span.dataset.colorName = colorNameDatasetValue()));
          createRenderEffect(() => classList.toggle("black-check", setBlackCheckClass()));
          createRenderEffect(() => classList.toggle("outlined-check", hasGradientOrOtherValidNonHexColor()));
        }}
      />
    ) as HTMLDivElement;

    return input_row;
  };

  const show_extras_signal = createSignal(false);
  const [get_show_extras] = show_extras_signal;
  const togglable_rest = createMemo(() => checkboxes().length > max_visible_without_collapsing);
  const expand_animation_duration = 200;
  const { expand, collapse, ExpandingContainer } = useExpandingContainerReactive({
    duration: expand_animation_duration,
  });
  const [get_having_expanding_in_dom, set_having_expanding_in_dom] = createSignal(untrack(togglable_rest)); // We need to remove the expanding els from the DOM if they're empty, otherwise the flexbox makes a weird gap to the right of the last item sometimes
  const expanding_container_els = (
    <ExpandingContainer>
      <Show when={togglable_rest()}>
        <Index each={checkboxes().slice(show_non_collapsible_when_collapsed)}>{render_checkbox}</Index>
      </Show>
    </ExpandingContainer>
  ) as HTMLDivElement;

  expanding_container_els.style.flexGrow = "1"; // gets weird otherwise with few elements (we need it to grow to take the whole width so the justify-content to get the gap works)
  const inner_div = expanding_container_els?.firstChild as HTMLDivElement | undefined;
  if (inner_div) {
    inner_div.classList.add("checkbox-color");
  } else {
    report(new Error("Someone refactored ExpandingContainer and broke CheckboxColor"), "error");
  }

  createComputed(() => {
    if (togglable_rest()) {
      set_having_expanding_in_dom(true); // instantly put into the DOM before the animation starts
    }
  });

  createRenderEffect(() => {
    set_view_more_button_below_group_(
      togglable_rest() ? <ExpandCollapseFilter show_extras_={show_extras_signal} i18n_={i18n_} /> : []
    );
  });

  onCleanup(() => set_view_more_button_below_group_());

  createEffect(
    catchify(async () => {
      if (!togglable_rest()) {
        await collapse();
        set_having_expanding_in_dom(false); // Once animation has finished, remove expanding from DOM
        // Waiting with removing might not be needed, but it felt slightly glitchy before and this works so leaving it
        return;
      }
      if (get_show_extras()) {
        await expand();
      } else {
        await collapse();
      }
    })
  );

  return (
    <form
      class="checkbox-color"
      ref={form!}
      onChange={catchify(() => {
        const set_filter = existing_filter();
        const { field, op } = filter_();
        const base_object = set_filter ? set_filter : { op, field };
        const filter_object = {
          ...base_object,
          data: [...new FormData(form)].filter(([_key, value]) => value === "on").map(([key]) => key),
        };
        const selected_filters = [...get_selected_filters()];
        if (set_filter) {
          selected_filters.splice(selected_filters.indexOf(set_filter), 1);
        }
        if (filter_object.data.length) {
          selected_filters.push(filter_object);
        }
        set_selected_filters(selected_filters);
      })}
    >
      <Index each={togglable_rest() ? checkboxes().slice(0, show_non_collapsible_when_collapsed) : checkboxes()}>
        {render_checkbox}
      </Index>
      <Show when={get_having_expanding_in_dom()}>{expanding_container_els}</Show>
    </form>
  );
}

// Daniel's magic https://gitlab.com/depict-ai/depict.ai/-/merge_requests/7648#note_1468373350
function does_black_contrast_better(rgb: [number, number, number]) {
  const luminance_color = relative_luminance_from_rgb(...rgb);
  const luminance_white = 1;
  const luminance_black = 0;
  const contrast_ratio_if_white = (luminance_white + 0.05) / (luminance_color + 0.05);
  const contrast_ratio_if_black = (luminance_color + 0.05) / (luminance_black + 0.05);
  return contrast_ratio_if_black > contrast_ratio_if_white;
}
