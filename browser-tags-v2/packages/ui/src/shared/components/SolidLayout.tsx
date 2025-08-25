/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  JSX as solid_JSX,
  onCleanup,
  Signal,
  untrack,
} from "solid-js";
import {
  catchify,
  ColsAtSize,
  layout_get_total_rec_amount_for_row,
  layout_get_visible_recs_without_partial_rows,
  layout_media_query_header,
  make_random_classname,
  n_col_styling_with_dist,
} from "@depict-ai/utilishared";
import { unwrap_solid_jsx_element } from "../helper_functions/unwrap_solid_jsx_element";
import { SentryErrorBoundary } from "./SentryErrorBoundary";
import { isServer } from "solid-js/web";

export type SolidLayoutOptions = {
  // all = only if no button && !rows
  cols_at_size: ColsAtSize;
  grid_spacing: string;
  rows:
    | {
        start_rows?: number;
        rows_per_click?: number;
        currently_visible?: Signal<number>;
        max_rows?: number;
        button?: solid_JSX.Element;
        view_less_button?: solid_JSX.Element;
      }
    | "all";
  layout: "slider" | "grid";
  disable_partial_rows?: boolean;
  override_vertical_spacing?: string;
  children: solid_JSX.Element;
  element_attributes: Omit<solid_JSX.HTMLAttributes<HTMLDivElement>, "classList">;
};

/**
 * SolidLayout: SolidJS adaption of Layout. Calculates CSS for a grid or slider with a certain spacing and certain number of columns at certain screen sizes, including a view more button. All properties are reactive.
 * @property       rows                  if set to 'all': Just generate grid styling without any viewing/hiding functionality. If an object: start_rows is the number of rows at the beginning. rows_per_click is the amount of rows to view on each view more button click. button is the view more button to display. currently_visible is a signal that you can use to get and set the number of currently viewed rows
 * @property       cols_at_size          An array with sub arrays looking like this: `[n_cols, min_width_media_query, max_width_media_query, grid_spacing_for_size]`, everything after `[n_cols, min_width]` is optional. falsey value for `min_width = no min_width`
 * @property       grid_spacing  spacing to use if none is specified for the specific size in `cols_at_size`
 * @property       disable_partial_rows  If set to `true`, will not let user press "show more" if next row is a partial row. Example of partial row: `cols_at_size` says we should have 4 recs in the next row, but we only have 2 left, so the row just gets 2 instead of 4, meaning it doesn't "fill out".
 * @property override_vertical_spacing by default, the grid_spacing is used both horizontally and vertically, with this you can specify a separate spacing
 * @return An accessor containing a CSS string
 */
export function SolidLayout(props: SolidLayoutOptions) {
  const container_class = "x" + createUniqueId();

  const container_element_ = (
    // For server side rendering, add the class with JSX
    <div {...props.element_attributes} classList={{ [container_class]: true }}>
      {props.children}
    </div>
  ) as HTMLDivElement; // Don't want this in the error boundary below, it should only be for the actual layouting
  return (
    <SentryErrorBoundary message_={"Failed calculating " + props.layout + " layout"} severity_="error">
      {SolidLayoutWithProvidedElement(props, container_element_, false, container_class)}
    </SentryErrorBoundary>
  );
}

/**
 * See SolidLayout JSDoc except that here you can provide your own element
 * When using insert_after_container, view more and view less buttons are not currently supported.
 */
export function SolidLayoutWithProvidedElement(
  props: Omit<SolidLayoutOptions, "children" | "element_attributes">,
  container_element: HTMLDivElement,
  insert_after_container = false,
  container_class?: string
) {
  if (!container_class) {
    // only try to add if it wasn't provided, so that we have a code path without classList when doing SSR
    container_class = make_random_classname();
    container_element.classList.add(container_class);
  }
  // Copy of Layout from utilishared but using solid-js signals instead of async iterable IPNS
  const show_all_rows = createMemo(() => props.rows === "all");
  const rows_or_empty_object = createMemo(() =>
    show_all_rows() ? {} : (props.rows as Exclude<typeof props.rows, "all">)
  );
  const view_more_button_elements = unwrap_solid_jsx_element(createMemo(() => rows_or_empty_object().button));
  const view_less_button_elements = unwrap_solid_jsx_element(createMemo(() => rows_or_empty_object().view_less_button));
  const have_a_view_more_button = createMemo(() => {
    const button = view_more_button_elements();
    return !(!button || (Array.isArray(button) && !button.length));
  });
  const have_a_view_less_button = createMemo(() => {
    const button = view_less_button_elements();
    return !(!button || (Array.isArray(button) && !button.length));
  });
  const [get_styling, set_styling] = createSignal<Accessor<solid_JSX.Element>>();
  const selector_beginning = `.depict .${container_class}>`; // class so ppl can have id if needed
  const [get_children_count, set_children_count] = createSignal<number>(0);
  const update_children_count = () => (isServer ? 20 : set_children_count(container_element.children.length));
  const col_styling = createMemo(() =>
    n_col_styling_with_dist(
      selector_beginning,
      props.grid_spacing,
      props.cols_at_size,
      props.layout,
      props.override_vertical_spacing
    )
  );
  const default_currently_visible_signal = createSignal(
    untrack(() => rows_or_empty_object().start_rows ?? rows_or_empty_object().max_rows ?? 1)
  ); // Keep this signal here, so it doesn't change when rows_or_empty_object and I think it's to be expected that the "internal default signal" stays the same
  const rows_visible_signal = createMemo(
    () => rows_or_empty_object().currently_visible || default_currently_visible_signal
  );
  const get_rows_visible = createMemo(() => rows_visible_signal()[0]());
  const set_rows_visible = createMemo(() => rows_visible_signal()[1]);
  const view_more_button_class = "m" + createUniqueId();
  const view_less_button_class = "l" + createUniqueId(); //  https://github.com/solidjs/solid-docs/issues/263#issuecomment-1622388079
  const view_more_button_container = createMemo(
    () =>
      have_a_view_more_button() && (
        <div
          class={`load-more-container ${view_more_button_class}`}
          onClick={catchify(() => set_rows_visible()(prev => prev + (rows_or_empty_object().rows_per_click ?? 1)))}
        >
          {rows_or_empty_object().button}
        </div>
      )
  );
  // We need to have duplicate buttons because which ones is shown depends on the number of rows visible and therefore on the viewport size and therefore on the css media queries
  const view_less_button_container = createMemo(
    () =>
      have_a_view_less_button() && (
        <div
          class={`load-less-container ${view_less_button_class}`}
          onClick={catchify(() => set_rows_visible()(() => rows_or_empty_object().start_rows ?? 1))}
        >
          {rows_or_empty_object().view_less_button}
        </div>
      )
  );
  const [force_style_update, set_force_style_update] = createSignal<"" | " ">("");

  createComputed(() => {
    // Make sure we don't have more rows visible than max_rows (this could happen by max_rows being decreased)
    const rows_visible = get_rows_visible();
    const max_rows = rows_or_empty_object().max_rows;
    if (!isNaN(max_rows as number) && (max_rows as number) >= 0 && rows_visible > (max_rows as number)) {
      set_rows_visible()(max_rows as number);
    }
  });

  createEffect(() => set_force_style_update(" ")); // force style update after hydration due to https://discord.com/channels/722131463138705510/722167424186843267/1151544212517552168

  createRenderEffect(() => {
    // Be careful to only read show_all_rows in here (ofc doesn't apply to nested effects)
    if (show_all_rows()) {
      // no view more functionality requested
      set_styling(() => col_styling);
      return;
    }

    update_children_count();

    if (!isServer) {
      const mutation_observer = new MutationObserver(catchify(update_children_count));
      mutation_observer.observe(container_element, { childList: true });
      onCleanup(() => mutation_observer.disconnect());
    }

    set_styling(
      // this is needed because solid will think that the memo-accessor is a setter function otherwise
      () =>
        createMemo(() => {
          const { rows_per_click, max_rows = -1, start_rows } = rows_or_empty_object();
          const rows_visible = get_rows_visible();
          const children_count = get_children_count();

          return (
            force_style_update() +
            col_styling() +
            props.cols_at_size
              .map(options => {
                const [recs_per_row, min, max] = options;
                let should_hide_view_more_button: boolean;
                let visible_recs: number;
                if (props.disable_partial_rows) {
                  visible_recs = layout_get_visible_recs_without_partial_rows(rows_visible, children_count, options);
                  const visible_recs_next_show_more = layout_get_visible_recs_without_partial_rows(
                    rows_visible + (rows_per_click || 0), // Should this really be zero when we default rows_per_click to 1?
                    children_count,
                    options
                  );
                  should_hide_view_more_button = visible_recs === visible_recs_next_show_more;
                } else {
                  visible_recs = layout_get_total_rec_amount_for_row(rows_visible, options);
                  should_hide_view_more_button = visible_recs >= children_count;
                }
                const should_hide_button_final =
                  should_hide_view_more_button || (max_rows !== -1 && rows_visible >= max_rows);

                // I don't really understand the logic for when the view more button gets hidden so IDK if below is correct, but it works how it should for now
                const should_hide_view_less_button =
                  !should_hide_view_more_button ||
                  start_rows == undefined ||
                  rows_visible <= start_rows ||
                  children_count <= recs_per_row * start_rows;

                return `${layout_media_query_header(min!, max!)}{${selector_beginning}:nth-child(n+${
                  visible_recs + 1
                }){display:none}${
                  props.layout == "slider" ? `${selector_beginning}:nth-child(n+${visible_recs}){margin-right:0}` : ""
                }${should_hide_button_final ? `.depict .${view_more_button_class}{display:none!important}` : ``}${
                  should_hide_view_less_button ? `.depict .${view_less_button_class}{display:none!important}` : ``
                }}`;
              })
              .join("")
          );
        })
    );
  });

  const style_element = <style type="text/css">{get_styling as unknown as solid_JSX.Element}</style>; // need to create this after set_styling has been called or else there will be no styling in the SSR'd output

  if (insert_after_container) {
    container_element.after(style_element as HTMLStyleElement);
  }

  return (
    <>
      {container_element}
      {view_more_button_container()}
      {view_less_button_container()}
      {style_element}
    </>
  );
}
