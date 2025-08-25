/** @jsxImportSource solid-js */
import { Accessor, createMemo, createUniqueId, JSX as solid_JSX } from "solid-js";
import {
  ColsAtSize,
  layout_media_query_header,
  make_random_classname,
  n_col_styling_with_dist,
} from "@depict-ai/utilishared";
import { SentryErrorBoundary } from "./SentryErrorBoundary";

export type CSSGridLayoutOptions = {
  cols_at_size: ColsAtSize;
  grid_spacing: string;
  override_vertical_spacing?: string;
  children: solid_JSX.Element;
  element_attributes: Omit<solid_JSX.HTMLAttributes<HTMLDivElement>, "classList">;
  top_row_shortened_by_: Accessor<number>;
};

export const spans_columns_variable_name = "--spans-columns";

/**
 * Generates a CSS grid layout with the given options, so that content blocks easily can be inserted.
 * Contrary to Layout.sx and SolidLayout.tsx also generates `display: grid`
 * Won't use `gap` for the vertical spacing if gap is in % to enable easy spacing using relative units, like with Layout and SolidLayout
 * No overrides supported rn
 */
export function CSSGridLayout(props: CSSGridLayoutOptions) {
  const container_class = "x" + createUniqueId();

  const container_element_ = (
    // For server side rendering, add the class with JSX
    <div {...props.element_attributes} classList={{ [container_class]: true }}>
      {props.children}
    </div>
  ) as HTMLDivElement; // Don't want this in the error boundary below, it should only be for the actual layouting
  return (
    <SentryErrorBoundary message_={"Failed calculating css grid layout"} severity_="error">
      {CSSGridLayoutWithProvidedElement(props, container_element_, false, container_class)}
    </SentryErrorBoundary>
  );
}

/**
 * See CSSGridLayoutWithProvidedElement JSDoc except that here you can provide your own element
 */
export function CSSGridLayoutWithProvidedElement(
  props: Omit<CSSGridLayoutOptions, "children" | "element_attributes">,
  container_element: HTMLDivElement,
  insert_after_container = false,
  container_class?: string
) {
  if (!container_class) {
    // only try to add if it wasn't provided, so that we have a code path without classList when doing SSR
    container_class = make_random_classname();
    container_element.classList.add(container_class);
  }
  const container_selector = `.depict .${container_class}`; // class so ppl can have id if needed
  const col_styling = createMemo(() =>
    generate_media_queried_declarations({
      container_selector_: container_selector,
      default_grid_spacing_text: props.grid_spacing,
      cols_at_size_: props.cols_at_size,
      override_vertical_spacing_: props.override_vertical_spacing,
      top_row_shortened_by_: props.top_row_shortened_by_(),
    })
  );
  const base_styling = createMemo(() => {
    return `${container_selector}{display:grid;}`;
  });
  const get_styling = createMemo(() => base_styling() + col_styling());

  const style_element = <style type="text/css">{get_styling as unknown as solid_JSX.Element}</style>; // need to create this after set_styling has been called or else there will be no styling in the SSR'd output

  if (insert_after_container) {
    container_element.after(style_element as HTMLStyleElement);
  }

  return (
    <>
      {container_element}
      {style_element}
    </>
  );
}

function generate_media_queried_declarations({
  container_selector_,
  default_grid_spacing_text,
  cols_at_size_,
  override_vertical_spacing_,
  top_row_shortened_by_,
}: {
  container_selector_: string;
  default_grid_spacing_text: string;
  cols_at_size_: ColsAtSize;
  override_vertical_spacing_: string | undefined;
  top_row_shortened_by_: number;
}) {
  return cols_at_size_
    .map(options => {
      const [n_cols, min, max, grid_spacing_for_size] = options;
      const main_spacing_to_use = grid_spacing_for_size || default_grid_spacing_text;
      // See comment in else block below
      const can_use_gap = override_vertical_spacing_
        ? can_use_gap_for_unit(override_vertical_spacing_)
        : can_use_gap_for_unit(main_spacing_to_use);

      let spacing_styling: string;
      let additional_styling = ""; // outside the media query

      if (can_use_gap) {
        spacing_styling = `gap:${main_spacing_to_use};${
          override_vertical_spacing_ ? `row-gap:${override_vertical_spacing_};` : ``
        }`;
      } else {
        // When using percent units, which our default styling does (because convenient) and our interface relies on (hard to specify different gaps for different screen sizes)
        // row gaps in grids are relative to the whole height of the grid, maybe see also https://stackoverflow.com/a/53563865. The issue with that is that as we load more products, the gap grows. Also, it breaks existing integrations.
        // Logical thought: use margins for the vertical spacing. But margins in grids are apparently relative to the size of the individual items in grids.
        // Given that, and that content blocks can be of different width, we have to do some complicated calculations to convert the provided gap, which is in gap of the total container width, to a margin of the individual items.
        const vertical_spacing_to_use = override_vertical_spacing_ ?? main_spacing_to_use;
        const width_multiplier = `var(${spans_columns_variable_name}, 1)`; // How many cards wide the current item is (needed because content blocks)
        const one_item_width_exclusing_gaps = `calc(calc(100 / ${n_cols}) - calc(calc(${
          n_cols * 2 - 2
        } * calc(${strip_percent_unit(vertical_spacing_to_use)} / 2)) / ${n_cols}))`; // Width of one item in percent of the whole
        // Equation from layout.tsx, also used in CheckboxGrid. Needs half spacing for some reason
        const this_item_width_meat = `calc(${one_item_width_exclusing_gaps} * ${width_multiplier})`; // Width of just the card
        const this_item_width_gaps = `calc(calc(${width_multiplier} - 1) * ${strip_percent_unit(
          vertical_spacing_to_use
        )})`; // Width of the gaps
        const this_item_width = `calc(${this_item_width_meat} + ${this_item_width_gaps})`; // Width of this item including gaps
        // this_item_width needs to be unitless, and since plain css can't do calc(40% / 5%) which would become unitless we need to strip all units in the calculations before
        const convert_top_spacing_to_item_width_percentage = (spacing: string) =>
          `calc(calc(100 / ${this_item_width}) * ${spacing})`; // Now finally we can convert the desired spacing to a percentage of this individual item's width (including gaps that would be there but aren't because content blocks span them)

        spacing_styling = `column-gap:${main_spacing_to_use};`; // Still use gaps in the horizontal direction because that works flawlessly

        // Re-use old layout code to get the correct :nth-child declarations for the top margins
        additional_styling = n_col_styling_with_dist(
          container_selector_ + ">",
          convert_top_spacing_to_item_width_percentage(default_grid_spacing_text),
          [
            [
              n_cols,
              min!,
              max!,
              grid_spacing_for_size ? convert_top_spacing_to_item_width_percentage(grid_spacing_for_size) : null,
            ],
          ],
          "grid",
          override_vertical_spacing_
            ? convert_top_spacing_to_item_width_percentage(override_vertical_spacing_)
            : override_vertical_spacing_,
          top_row_shortened_by_
        );
      }

      const media_query_body = `${container_selector_}{${spacing_styling}grid-template-columns:repeat(${n_cols},minmax(0,1fr));}`;

      return `${layout_media_query_header(min!, max!)}{${media_query_body}}${additional_styling}`;
    })
    .join("");
}

function can_use_gap_for_unit(spacing: string) {
  const trimmed_spacing = spacing.trim();
  return !trimmed_spacing.includes("%");
}

function strip_percent_unit(css_value: string) {
  return css_value.replaceAll("%", "");
}
