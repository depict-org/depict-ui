import { observer } from "../../element-observer";
import { zip_async_iterables } from "../../utilities/infinite_promise/zip_async_iterables";
import { use_listener } from "../../jsx-runtime";
import { catchify } from "../../logging/error";
import { make_random_classname } from "../../utilities/random_string";
import { async_iterable_ipns, IPNS } from "../../utilities/infinite_promise/async_iterable_ipns";

/** Overrides that can specify a different amount of columns for certain rows
 * @param key The row (starts at 1) that you're "selecting" to override
 * @param value The amount of columns that your selected row should have
 */
type Override = { overrides: Record</* Row: */ number, /* Column: */ number> };

export type ColAtSize =
  | /** [ <number of columns>, <min-width>, <max-width>, <spacing> ] */
  readonly [number, null, string, string | null]
  | readonly [number, string, string, null, Override]
  | readonly [number, string, null, string | null]
  | readonly [number, string, string, string | null]
  | readonly [number, string, null]
  | readonly [number, string, string]
  | readonly [number, null, string]
  | readonly [number, string];

export type ColsAtSize = readonly ColAtSize[];

export type LayoutOptions = {
  // all = only if no button && !rows
  container_element: Element;
  cols_at_size: ColsAtSize;
  grid_spacing: string;
  rows:
    | {
        start_rows?: number;
        rows_per_click?: number;
        ipns?: IPNS<number>;
        max_rows?: number;
        button?: HTMLElement;
      }
    | "all";
  layout: "slider" | "grid";
  disable_partial_rows?: boolean;
  override_vertical_spacing?: string;
};

export const layout_media_query_header = (min: string, max?: string) =>
  `@media ${min ? `(min-width:${min})` : ``}${min && max ? ` and ` : ``}${max ? `(max-width:${max})` : ``}`;

/**
 * Grid: Calculates CSS for a grid with a certain spacing and certain number of columns at certain screen sizes, including a view more button.
 * @param       rows                  if set to 'all': Just generate grid styling without any viewing/hiding functionality. If an object: start_rows is the number of rows at the beginning. rows_per_click is the amount of rows to view on each view more buttonn click. button is the view more button to display. ipns is an async iterable infinite promise that you can use to get and set the number of currently viewed rows
 * @param       container_element     container element of the elements that you want to style and hide
 * @param       cols_at_size          An array with sub arrays looking like this: `[n_cols, min_width_media_query, max_width_media_query, grid_spacing_for_size]`, everything after `[n_cols, min_width]` is optional. falsey value for `min_width = no min_width`
 * @param       grid_spacing  spacing to use if none is specified for the specific size in `cols_at_size`
 * @param       disable_partial_rows  If set to `true`, will not let user press "show more" if next row is a partial row. Example of partial row: `cols_at_size` says we should have 4 recs in the next row but we only have 2 left, so the row just gets 2 instead of 4, meaning it doesn't "fill out".
 * @param override_vertical_spacing by default, the grid_spacing is used both horizontally and vertically, with this you can specify a separate spacing
 */
export async function Layout({
  rows,
  container_element,
  cols_at_size,
  grid_spacing,
  layout,
  disable_partial_rows,
  override_vertical_spacing,
}: LayoutOptions) {
  const rows_or_empty_object = typeof rows == "object" ? rows : ({} as Exclude<LayoutOptions["rows"], "all">); // this is to satisfy typescript
  const { start_rows = 1, button, max_rows = -1 } = rows_or_empty_object;
  let { ipns } = rows_or_empty_object as {
    ipns: IPNS<number> /* this is a lie to satisfy typescript, it's forced to be defined after `ipns ||= async_iterable_ipns<number>()` */;
  };
  const is_static = !ipns && !button;
  const our_style_el = (<style type="text/css" />) as HTMLStyleElement;
  const container_class = make_random_classname();
  const selector_beginning = `.depict .${container_class}>`;
  const el_count_ipns = async_iterable_ipns<number>();
  const set_length = () => el_count_ipns(container_element.children.length);
  const col_styling = n_col_styling_with_dist(
    selector_beginning,
    grid_spacing,
    cols_at_size,
    layout,
    override_vertical_spacing
  );
  let button_class: string | undefined;
  ipns ||= async_iterable_ipns<number>();

  container_element.after(our_style_el);
  container_element.classList.add(container_class);

  if (rows === "all") {
    // no view more functionality requested
    our_style_el.append(col_styling);
    return;
  }

  ipns(start_rows);
  set_length();

  const mutation_observer = new MutationObserver(catchify(set_length));
  observer.oncreation(container_element, ({ element }) => {
    mutation_observer.observe(element, { childList: true });
    set_length(); // might have changed while we weren't in the DOM but no need to observe and update when we aren't
  });
  observer.onremoved(container_element, ({ element }) => {
    if (document.documentElement.contains(element)) {
      return;
    }
    mutation_observer.disconnect();
    el_count_ipns.exit();
    ipns.exit();
  });

  if (button) {
    button_class = make_random_classname();
    const button_container = (
      <div class={"load-more-container " + button_class}>
        {use_listener("click", () => ipns(ipns.state! + (rows_or_empty_object.rows_per_click ?? 1)), button)}
      </div>
    ) as HTMLDivElement;
    container_element.after(button_container);
  }

  observer.oncreation(container_element, async () => {
    for await (const [currently_showing_rows, number_of_els] of zip_async_iterables<[number, number]>([
      // start for await loop when the container element gets inserted into the DOM
      // the loop is broken by an observer.onremoved above calling .exit on the IPNS this depends on
      // @ts-ignore
      ipns,
      // @ts-ignore too complicated to fix this IMO
      el_count_ipns,
    ])) {
      our_style_el.innerText =
        col_styling +
        cols_at_size
          .map(options => {
            const [, min, max] = options;
            let should_hide_button: boolean;
            let visible_recs: number;
            if (disable_partial_rows) {
              visible_recs = layout_get_visible_recs_without_partial_rows(
                currently_showing_rows,
                number_of_els,
                options
              );
              const visible_recs_next_show_more = layout_get_visible_recs_without_partial_rows(
                currently_showing_rows + (rows_or_empty_object.rows_per_click || 0),
                number_of_els,
                options
              );
              should_hide_button = visible_recs === visible_recs_next_show_more;
            } else {
              visible_recs = layout_get_total_rec_amount_for_row(currently_showing_rows, options);
              should_hide_button = visible_recs >= number_of_els;
            }
            const should_hide_button_final =
              button_class && (should_hide_button || (max_rows !== -1 && currently_showing_rows >= max_rows));

            return `${layout_media_query_header(min!, max!)}{${selector_beginning}:nth-child(n+${
              visible_recs + 1
            }){display:none}${
              layout == "slider" ? `${selector_beginning}:nth-child(n+${visible_recs}){margin-right:0}` : ""
            }${should_hide_button_final ? `.depict .${button_class}{display:none!important}` : ``}}`;
          })
          .join("");
      if (is_static) {
        break;
      }
    }
  });
}

/** Getting how many recs should be displayed for a certain row (while taking override rules into account)
 * This returns number of recs for this row and all the previous ones
 * @param row The "index" of the row (counting from the top). Starts at 1.
 * @param options Your cols_at_size layout option
 */
export function layout_get_total_rec_amount_for_row(row: number, options: LayoutOptions["cols_at_size"][number]) {
  const [default_cols, , , , override_obj] = options;
  const overrides = override_obj?.overrides || {};
  let total = 0;
  for (let current_r = 1; current_r <= row; current_r++) {
    const cols = overrides[current_r] || default_cols;
    total += cols;
  }
  return total;
}

/**
 * Same as `get_total_rec_amount_for_row` but caps the result to never exceed @param max_recs
 */
export function layout_get_visible_recs_without_partial_rows(
  rows: number,
  max_recs: number,
  options: LayoutOptions["cols_at_size"][number]
) {
  let visible_recs: number;
  while ((visible_recs = layout_get_total_rec_amount_for_row(rows--, options)) > max_recs);
  return visible_recs;
}

/**
 * basically equivalent of n_col_styling css mixin - generates distances for a flex grid with margins
 * @param  selector_beginning               Main selector targeting container classname to use in generated css
 * @param  default_grid_spacing_text                Spacing to use if not specified in cols_at_size for a specific size
 * @param       cols_at_size          An array with sub arrays looking like this: [n_cols, min_width_media_query, max_width_media_query, grid_spacing_for_size], everything after [n_cols, min_width] is optional. falsey value for min_width = no min_width
 * @param layout "slider" or "grid"
 * @param override_vertical_spacing by default, the grid_spacing is used both horizontally and vertically, with this you can specify a separate spacing
 * @param only_generate_top_margins if a number, only generates top margins, not widths or side margins (this is used by the content block code to allow still having relative gap's). The provided number subtracts from the top row (makes us pretend it's shorter, for content blocks). Only works for layout = "grid"
 * @return String of generated CSS
 */
export function n_col_styling_with_dist(
  selector_beginning: string,
  default_grid_spacing_text: string,
  cols_at_size: ColsAtSize,
  layout: "slider" | "grid",
  override_vertical_spacing?: string,
  only_generate_top_margins?: number
) {
  function get_width_of_middle_elements(n_cols: number, spacing: CSSMeasurement) {
    return `width:${css_subtract(
      css_divide(new CSSMeasurement("100%"), n_cols),
      css_divide(css_multiply(n_cols * 2 - 2, spacing), n_cols)
    )}`;
  }
  function get_width_css(n_cols: number, selector: string, spacing: CSSMeasurement) {
    const width_css = get_width_of_middle_elements(n_cols, spacing);
    const margin_css = `margin-left:${spacing};margin-right:${spacing}`;
    return `${selector}{${margin_css};${width_css}}`;
  }

  function get_horizontal_spacing_css(start: number, end: number, selector: string, spacing: CSSMeasurement) {
    const left_removed_css = `${selector}:nth-child(${start}){margin-left:0}`;
    const right_removed_css = `${selector}:nth-child(${end}){margin-right:0}`;
    return left_removed_css + right_removed_css;
  }

  function get_vertical_spacing_css(
    selector: string,
    spacing: CSSMeasurement,
    options: LayoutOptions["cols_at_size"][number]
  ) {
    const shorten_top_row_by = only_generate_top_margins ?? 0;
    const top_row_selector = `${selector}:nth-child(n+1):nth-child(-n+${
      layout_get_total_rec_amount_for_row(1, options) - shorten_top_row_by
    })`;
    const between_spacing_css = `${selector}:not(${top_row_selector}){margin-top:${
      override_vertical_spacing ?? css_multiply(spacing, 2)
    }}`;
    return between_spacing_css;
  }

  function get_left_right_0_spacing_rest_of_rows_css(n_cols: number, start: number, selector_beginning: string) {
    const right = `${selector_beginning}:nth-child(${n_cols}n+${start}){margin-left:0}`;
    const left = `${selector_beginning}:nth-child(${n_cols}n+${start + n_cols - 1}){margin-right:0}`;
    return right + left;
  }

  const half_default_spacing = css_divide(new CSSMeasurement(default_grid_spacing_text), 2);
  return cols_at_size
    .map(options => {
      const [n_cols, min, max, grid_spacing_for_size, override] = options;
      const half_spacing = grid_spacing_for_size
        ? css_divide(new CSSMeasurement(grid_spacing_for_size), 2)
        : half_default_spacing;

      let media_query_body = "";

      if (layout == "grid") {
        const overrides = override?.overrides || {};
        const sorted = Object.keys(overrides).sort((r1, r2) => parseInt(r1) - parseInt(r2));
        const last_override_row = sorted.at(-1);

        /** We run this loop up until the last override rule + 1.
         * The last iteration will create styling rules that apply to every row that comes after it.
         * Let's say we have one override rule for row 2.
         * We:
         *  1. Create styling for row 1
         *  2. Create styling for row 2
         *  3. Create styling for row 3 which will apply to the rest of the rows. Every row will be the same from now on.
         */
        const max_row = last_override_row ? parseInt(last_override_row) + 1 : 1;
        for (let row = 1; row <= max_row; row++) {
          const real_n_cols = overrides[row] || n_cols;
          const amount_until_now = layout_get_total_rec_amount_for_row(row - 1, options);
          const amount_next_row = layout_get_total_rec_amount_for_row(row, options);
          const start = amount_until_now + 1;
          const end = amount_next_row;

          const is_last_iteration = row === max_row;
          let row_selector = selector_beginning;
          if (is_last_iteration) {
            row_selector += `:nth-child(n+${start})`;
          } else {
            row_selector += `:nth-child(n+${start}):nth-child(-n+${end})`;
          }

          if (only_generate_top_margins == undefined) {
            media_query_body += get_width_css(real_n_cols, row_selector, half_spacing);
            media_query_body += get_horizontal_spacing_css(start, end, row_selector, half_spacing);
          }
          media_query_body += get_vertical_spacing_css(row_selector, half_spacing, options);
          if (is_last_iteration && only_generate_top_margins == undefined) {
            media_query_body += get_left_right_0_spacing_rest_of_rows_css(n_cols, start, selector_beginning);
          }
        }
      } else if (layout == "slider") {
        const margin_and_width_of_middle_elements = get_width_css(n_cols, `${selector_beginning}*`, half_spacing);

        media_query_body += margin_and_width_of_middle_elements;

        const start_and_end_no_margin = `${selector_beginning}:first-child{margin-left:0}${selector_beginning}:last-child{margin-right:0}`;
        media_query_body += start_and_end_no_margin;
      } else {
        throw new Error("invalid layout");
      }
      const retval = `${layout_media_query_header(min!, max!)}{${media_query_body}}`;
      return retval;
    })
    .join("");
}

function css_subtract(a: CSSMeasurement, b: CSSMeasurement) {
  if (a.is_fe || b.is_fe || a.u !== b.u) {
    return new CSSMeasurement(`calc(${a} - ${b})`);
  } else {
    // @ts-ignore
    return new CSSMeasurement(a - b + a.u);
  }
}

function css_add(a: CSSMeasurement, b: CSSMeasurement) {
  if (a.is_fe || b.is_fe || a.u !== b.u) {
    return new CSSMeasurement(`calc(${a} + ${b})`);
  } else {
    // @ts-ignore
    return new CSSMeasurement(+a + +b + a.u);
  }
}

function css_multiply(a: CSSMeasurement | number, b: CSSMeasurement | number) {
  const a_is_num = typeof a === "number";
  const b_is_num = typeof b === "number";
  if (a_is_num && b_is_num) {
    throw new Error("At least one value needs a unit");
  }
  // @ts-ignore
  if (a.is_fe || b?.is_fe || (!b_is_num && !a_is_num && a.u !== b.u)) {
    return new CSSMeasurement(`calc(${a} * ${b})`);
  } else {
    // @ts-ignore
    return new CSSMeasurement(a * b + (a.u || b.u));
  }
}

function css_divide(a: CSSMeasurement, b: CSSMeasurement | number) {
  // @ts-ignore
  if (a.is_fe || b?.is_fe || (typeof b !== "number" && a.u !== b.u)) {
    return new CSSMeasurement(`calc(${a} / ${b})`);
  } else {
    // @ts-ignore
    return new CSSMeasurement(a / b + a.u);
  }
}

interface CSSMeasurement {
  v?: number; // value, i.e. `5` for 5%
  u?: "cm" | "mm" | "in" | "px" | "pt" | "pc" | "em" | "ex" | "ch" | "rem" | "vw" | "vh" | "vmin" | "vmax" | "%"; // unit, i.e. `%` for 5%
  e?: string; // expression, i.e. `calc(50% - 4rem)` for calc(50% - 4rem)
  is_fe: boolean; // whether it's a function expression like calc, min, max, clamp, etc
}

class CSSMeasurement {
  [Symbol.iterator] = function* () {
    if (this.is_fe) {
      throw new Error("Function expression isn't iterable: " + this.e);
    }
    yield this.v;
    yield this.u;
  };

  valueOf() {
    if (this.is_fe) {
      throw new Error("Cannot convert function expression: " + this.e + " to number");
    } else {
      return this.v;
    }
  }

  toString() {
    if (this.is_fe) {
      return this.e;
    } else {
      return this.v! + this.u!;
    }
  }

  [Symbol.toPrimitive](hint: "number" | "string" | "default") {
    return hint == "number" ? this.valueOf() : this.toString();
  }

  constructor(measurement: string) {
    if (measurement.includes("(") && measurement.includes(")")) {
      this.is_fe = true;
      this.e = measurement;
      return;
    }
    const number = parseFloat(measurement);
    const unit = measurement.replace("" + number, "");
    if (!unit) {
      throw new Error("CSSValue needs a unit: " + measurement);
    }
    this.v = number;
    this.u = unit as CSSMeasurement["u"];
  }
}
