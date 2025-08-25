/** @jsxImportSource solid-js */
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  Index,
  JSX,
  onCleanup,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { catchify, ColsAtSize } from "@depict-ai/utilishared";
import { SolidLayout } from "../../SolidLayout";
import { make_accurate_width_accessor } from "../../../helper_functions/make_accurate_width_accessor";
import { to_lower_case_if_possible } from "../../../helper_functions/to_lower_case_if_possible";
import { HighlightTextInSpan } from "../../../../search/components/HighlightTextInSpan";

type SizeItem = Accessor<number | undefined>;

const gap_px = 5;
const max_columns = 3;

/**
 * Renders a bunch of "checkboxes" as buttons, moodboard style. Commonly used for the size filter.
 */
export const CheckboxGrid = ({
  filter_,
  selected_filters_: [get_selected_filters, set_selected_filters],
  filter_query_,
  details_element_width_,
}: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<SearchFilter[]>;
  filter_query_?: Accessor<string | undefined>;
  details_element_width_: Accessor<number | undefined>;
}) => {
  const existing_filter = createMemo(() => {
    const { field, op } = filter_();
    return get_selected_filters().find(
      ({ field: checking_field, op: checking_op }) => checking_field === field && checking_op === op
    );
  });

  const buttons = createMemo(() => {
    const meta = filter_().meta as ValuesFilterMeta;
    return meta.values.map(
      (value_, index) => ({ value_, name_: meta.names?.[index], count_: meta.counts?.[index] }) as const
    );
  });

  const [sizes_set, set_sizes_set] = createSignal<Set<SizeItem>>(new Set(), { equals: false });
  const [cols_at_size, set_cols_at_size] = createSignal<ColsAtSize>([[1, "0px", ""]]);
  const [container, set_container] = createSignal<HTMLElement | undefined>();

  const container_width_accessor = createMemo(() => {
    const element = container();
    if (!element) return;
    return make_accurate_width_accessor(element);
  });
  const [shadow_children, set_shadow_children] = createSignal<Set<JSX.Element>>(new Set(), { equals: false });
  const shadow_grid = (
    <div class="checkbox-grid" style="position:absolute;z-index:-1;pointer-events:none;opacity:0" aria-hidden="true">
      {[...shadow_children()]}
    </div>
  ); // for getting the smallest possible sizes of all the items

  createEffect(() => {
    const container_width = container_width_accessor()?.() || details_element_width_();
    if (container_width === undefined) return; // On firefox, unexpanded <details> elements' contents dont't have a width, fall back to the width of the details element itself to not have janky expanding animations due to wrong number of columns at point of expanding
    adjust_sizes(container_width, sizes_set(), set_cols_at_size);
  });

  return (
    <>
      <SolidLayout
        cols_at_size={cols_at_size()}
        grid_spacing={gap_px + "px"}
        rows="all"
        layout="grid"
        element_attributes={{ class: "checkbox-grid", ref: el => set_container(el) }}
      >
        <Index each={buttons()}>
          {value => {
            const is_selected = createMemo(() => {
              const data = existing_filter()?.data as string[] | undefined;
              const current_value = to_lower_case_if_possible(value().value_ as string);
              return !!data?.some(item => to_lower_case_if_possible(item) === current_value);
            });

            const MakeButton = (attributes: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
              const label = createMemo(() => value().name_ || value().value_ + "");
              const count_zero = createMemo(() => value().count_ === 0);

              return (
                <button
                  {...attributes}
                  disabled={count_zero() && !is_selected()}
                  classList={{ minor: !is_selected(), major: is_selected(), "major-minor-transition": true }}
                  onClick={catchify(() => {
                    const set_filter = existing_filter();
                    const { field, op } = filter_();
                    const base_object = set_filter ? set_filter : { op, field };
                    const old_data = base_object.data;
                    const new_data = [...(Array.isArray(old_data) ? [...old_data] : old_data ? [old_data] : [])];
                    const new_filter_object = {
                      ...base_object,
                      data: new_data as string[],
                    };
                    if (!is_selected()) {
                      new_filter_object.data.push(value().value_ as string);
                    } else {
                      const current_value_lower = to_lower_case_if_possible(value().value_ as string);
                      new_filter_object.data = new_filter_object.data.filter(
                        v => to_lower_case_if_possible(v) !== current_value_lower
                      );
                    }
                    const selected_filters = [
                      ...get_selected_filters().filter(f => f !== set_filter),
                      ...(new_filter_object.data.length ? [new_filter_object] : []),
                    ];
                    set_selected_filters(selected_filters);
                  })}
                >
                  {/* Don't show highlighted text when disabled because a) it's confusing and b) the highlighting color messed up the disableing color */}
                  <Show
                    when={count_zero()}
                    fallback={
                      <HighlightTextInSpan
                        whole_text_to_display_={label}
                        searching_for_value_={() => filter_query_?.()}
                      />
                    }
                  >
                    {label()}
                  </Show>
                  <Show when={value().count_ != undefined}>
                    <span class="count-wrapper">
                      <span class="count">{value().count_}</span>
                    </span>
                  </Show>
                </button>
              );
            };

            const invisible_size_button = (<MakeButton tabIndex={-1} />) as HTMLButtonElement;
            const smallest_possible_size = make_accurate_width_accessor(invisible_size_button); // create ResizeObserver for the invisible size button where the div hugs its content
            const sizes_value = untrack(sizes_set);
            const shadow_children_value = untrack(shadow_children);

            sizes_value.add(smallest_possible_size);
            set_sizes_set(sizes_value);
            shadow_children_value.add(invisible_size_button);
            set_shadow_children(shadow_children_value);

            onCleanup(() => {
              const sizes_value = untrack(sizes_set);
              const shadow_children_value = untrack(shadow_children);
              sizes_value.delete(smallest_possible_size);
              set_sizes_set(sizes_value);
              shadow_children_value.delete(invisible_size_button);
              set_shadow_children(shadow_children_value);
            });

            // The actual button that will be visible
            return <MakeButton />;
          }}
        </Index>
      </SolidLayout>
      {shadow_grid}
    </>
  );
};

/**
 * Calculate and apply cols_at_size overrides to fit as many items as possible in a row, evenly spaced
 */
function adjust_sizes(
  container_width: number,
  sizes: Set<SizeItem>,
  set_cols_at_size: (new_value: ColsAtSize) => void
): void {
  let current_row_index = 0;
  let current_row_items: number[] = [];
  const column_to_row_result: Record<number, number> = {};
  const check_would_fit_evenly = (min_size_of_item: number, at_number_of_columnns: number) => {
    const would_have_even_size =
      container_width / at_number_of_columnns -
      ((at_number_of_columnns * 2 - 2) * (gap_px / 2)) / at_number_of_columnns; // What size would our element have (without gaps), given that now every column had the same width (equation from Layout.tsx)
    return would_have_even_size >= min_size_of_item; // would this item still fit if we added another column? (probably what the caller has done with at_number_of_columns), given that every item has the same size
  };

  for (const size_item of sizes) {
    const size = size_item();
    if (size == undefined) return; // Only do stuff if we know all the sizes
    const current_row_length = current_row_items.length;

    const can_add_another_column_initial_val = current_row_length < max_columns; // allow max 4 items per row
    let can_add_another_column = can_add_another_column_initial_val;

    if (can_add_another_column) {
      // can we actually? Since adding another column changes the size of all elements in the row we need to check all of them
      for (let i = -1; i < current_row_length; i++) {
        // -1 is for the new item we're adding and every item is guaranteed to exist
        const size_to_check = (current_row_items[i] as number | undefined) ?? size;
        const would_have_columns = current_row_length + 1; // if we added another column
        const would_fit_evenly = check_would_fit_evenly(size_to_check, would_have_columns); // see comments in check_would_fit_evenly

        if (!would_fit_evenly) {
          can_add_another_column = false;
          break;
        }
      }
    }

    if (can_add_another_column) {
      current_row_items.push(size);
    } else {
      column_to_row_result[++current_row_index] = current_row_length || 1; // overrides is indexed by 1 it seems, therefore ++curent_row_index
      current_row_items = [size]; // save current item for next row
    }
  }

  const items_left_to_add = current_row_items.length;
  if (items_left_to_add) {
    let num_columns = 1; // We want to have as close to max_columns as possible in the last row
    let fits = true;
    do {
      // Check if more columns would fit
      for (let i = 0; i < items_left_to_add; i++) {
        const item = current_row_items[i];
        const would_fit_evenly = check_would_fit_evenly(item, num_columns + 1);
        if (!would_fit_evenly) {
          fits = false;
          break;
        }
      }
    } while (fits && ++num_columns < max_columns);

    column_to_row_result[++current_row_index] = num_columns; // Add last row that's left after loop finished
  }

  set_cols_at_size([[1, "0px", "", null, { overrides: column_to_row_result }]]);
}
