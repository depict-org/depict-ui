/** @jsxImportSource solid-js */
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  JSX as solid_JSX,
  mapArray,
  mergeProps,
  Setter,
  Show,
  Suspense,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { ColsAtSize } from "@depict-ai/utilishared";
import { get_cols_currently_showing } from "../../helper_functions/get_cols_currently_showing";
import { spans_columns_variable_name } from "../CSSGridLayout";
import { ImagePlaceholder } from "../Placeholders/ImagePlaceholder";

/**
 * The interface for a content block.
 * Please make sure that you don't have content blocks overlap as that will cause undefined behavior.
 * The height of the content block will be the height of the tallest item in a row, so if there are no products in a row the content block needs to "bring its own height".
 * If you need to load any data in the content block, please make sure to return a placeholder while you're doing so (see `ImagePlaceholder`), to avoid layout shifts and ensure scroll restoration works correctly.
 *
 * - `span_columns`: How many columns the block should span. This will be capped to the number of columns available.
 * - `span_rows`: How many rows the block should span.
 * - `position`: Where the block should be positioned. Can be `left`, `center` or `right`.
 * - `content`: The content to render in the block - please provide a function returning one or multiple HTML elements.
 */
export type ContentBlock = {
  span_columns: number;
  span_rows: number;
  position: "left" | "center" | "right";
  content: () => solid_JSX.Element | Promise<solid_JSX.Element>;
};
/**
 * A sparse array containing content blocks to show (or an empty slot or undefined if there's no block at that index). See ContentBlock for how a content block looks like. The index is the row where the content block should be shown.
 * For example, to create a block on row 1 and 3 you'd do `[, block1, , block2]`.
 * Alternatively:
 * ```
 * const blocks = [];
 * blocks[1] = block1;
 * blocks[3] = block2;
 * ```
 */
export type ContentBlocksByRow = (undefined | ContentBlock)[];

/**
 * Renders content blocks with some fancy diffing, and returns an array of content blocks that the places rendering displays and placeholders can put into the DOM.
 */
export function create_content_blocks({
  content_blocks_: incoming_content_blocks,
  cols_at_size_,
  set_top_row_shortened_by_,
}: {
  content_blocks_: Accessor<ContentBlocksByRow | undefined>;
  cols_at_size_: Accessor<ColsAtSize>;
  set_top_row_shortened_by_: Setter<number>; // lets us reduce the number of products to generate margin-top spacing declarations for even though they are in the first row
}) {
  // these are by row
  const [content_blocks, set_content_blocks] = createStore<ContentBlocksByRow>([]);
  const n_cols_currently_showing_ = get_cols_currently_showing(cols_at_size_);

  createEffect(() => {
    const incoming_value = incoming_content_blocks();
    if (!incoming_value) {
      set_content_blocks([]);
      return;
    }
    set_content_blocks(reconcile(incoming_value, { key: "content" })); // key: Make moving blocks faster, see https://github.com/solidjs/solid/issues/1925#issuecomment-1769671596
  });

  const get_wrapped_blocks_ = wrap_blocks_in_div(content_blocks, n_cols_currently_showing_);

  createComputed(() => {
    // Update our styling if a content block forces some items that should be in the top row into a lower one, so we can generate margin-top declarations for them
    const top_row_block = get_wrapped_blocks_()[0];
    const blocks_in_top_row_taken = top_row_block?.span_columns;
    if (blocks_in_top_row_taken == undefined) {
      // Fall back to zero if no content block in top row, since then no blocks in top row are taken
      set_top_row_shortened_by_(0);
      return;
    }
    set_top_row_shortened_by_(blocks_in_top_row_taken - 1); // minus one because the content block wrapper also is an element
  });

  const remapped_ = createMemo(() =>
    remap_blocks_to_index({
      wrapped_blocks_: get_wrapped_blocks_(),
      n_cols_currently_showing_: n_cols_currently_showing_(),
    })
  );
  const content_blocks_by_index_ = createMemo(() => remapped_().content_blocks_by_index_);

  return Object.assign(content_blocks_by_index_, {
    trailing_: (product_count: number) =>
      trailing_content_blocks({
        ...remapped_(),
        n_cols_currently_showing_: n_cols_currently_showing_(),
        product_count,
      }),
  });
}

/**
 * Does pure calculations where to put each of the finished wrapped content blocks in the elements in the grid (input is by row). You need to cap span_columns of the blocks to the columns available before passing them to this function.
 * Also used in the portal in react.
 * @returns content_blocks_by_index_: an array where index is index of the blocks in the "displays array" and value is the content block (elements) to show at that index.
 * displaced_products_: internal state that can be used to figure out if there's parts of a content block on a row, see the comment inside this function
 */
export function remap_blocks_to_index<T = () => solid_JSX.Element | Promise<solid_JSX.Element>>({
  wrapped_blocks_,
  n_cols_currently_showing_,
}: {
  wrapped_blocks_: (
    | undefined
    | {
        span_columns: number;
        span_rows: number;
        position: "left" | "center" | "right";
        content: T;
      }
  )[];
  n_cols_currently_showing_: number | null;
}) {
  // This computation should be quite cheap since it just moves around things into an array
  const content_blocks_by_index_: (Awaited<T> | Awaited<T[]>)[] = [];
  const rows_by_index_: number[][] = []; // the row of each block at each index of content_blocks_by_index_, in the same order
  const constructed_block_arrays = new WeakSet<Awaited<T>[]>();
  // Need to keep track of products displaced by blocks above when mapping rows to indexes in the actual grid
  const displaced_products_: ((undefined | true)[] | number)[] = []; // undefined = is product, true = is content block if number instead of tuple number indicates content blocks in that row. Index in first array is row, index in second array is column

  if (!n_cols_currently_showing_) {
    // Nope out of here if we don't know how many columns are showing
    return { content_blocks_by_index_, rows_by_index_, displaced_products_ };
  }

  for (let i = 0; i < wrapped_blocks_.length; i++) {
    // i = row to show at
    const block = wrapped_blocks_[i];
    if (!block) continue; // Array can have holes/not defined places
    const index_of_first_item_in_row = i * n_cols_currently_showing_;
    const index_of_last_item_in_row = index_of_first_item_in_row + n_cols_currently_showing_;
    const { span_rows, position, span_columns } = block; // span columns is already capped in the block wrapping step (wrap_blocks_in_div)
    let target_index: number;

    if (position === "left") {
      target_index = index_of_first_item_in_row;
    } else if (position === "right") {
      target_index = index_of_last_item_in_row - span_columns;
    } else if (position === "center") {
      target_index = index_of_first_item_in_row + Math.floor((n_cols_currently_showing_ - span_columns) / 2);
    } else {
      throw new Error(
        "Invalid position for content block - must be left, right or center: " + JSON.stringify(position)
      );
    }

    // Calculate displacement of us by content blocks above us
    let displacement_by_added_blocks = 0;
    for (let j = 0; j < i; j++) {
      const row = displaced_products_[j];
      if (row === undefined) continue; // there were no blocks in this row
      let displaced_items_in_row: number;
      if (typeof row === "number") {
        displaced_items_in_row = row;
      } else {
        displaced_items_in_row = row.filter(item => item).length;
        displaced_products_[j] = displaced_items_in_row;
      }
      displacement_by_added_blocks += displaced_items_in_row;
    }
    const index_of_us_in_row = target_index - index_of_first_item_in_row;
    for (let j = 0; j < index_of_us_in_row; j++) {
      if (displaced_products_[i]?.[j]) {
        // Add blocks in our *current* row to the displacement, but only the ones to our left
        displacement_by_added_blocks++;
      }
    }

    // Add block to output array at the correct index
    const final_target_index = target_index - displacement_by_added_blocks;
    const existing_block = content_blocks_by_index_[final_target_index] as Awaited<T> | undefined;
    const block_content = block.content as unknown as Awaited<T>;
    // If two blocks want to exist at the same location (can happen, for example if one block wants to be at the end of a row and the other one at the start of the next row) add an array with both
    if (existing_block) {
      if (constructed_block_arrays.has(existing_block as any)) {
        // Only push to arrays we have created to not create funky bugs when there's an array in JSX.Element
        (existing_block as Awaited<T>[]).push(block_content);
      } else {
        const array = [existing_block, block_content];
        constructed_block_arrays.add(array);
        content_blocks_by_index_[final_target_index] = array;
      }
    } else {
      content_blocks_by_index_[final_target_index] = block_content;
    }
    (rows_by_index_[final_target_index] ||= []).push(i);

    // Update displacement
    for (let j = 0; j < span_rows; j++) {
      const row = (displaced_products_[i + j] ||= []) as (undefined | true)[];
      for (let k = index_of_us_in_row; k < index_of_us_in_row + span_columns; k++) {
        row[k] = true;
      }
    }
  }

  return { content_blocks_by_index_, rows_by_index_, displaced_products_ } as const;
}

/**
 * Returns the content blocks placed after the last product that still sit in the last product's row, in index order.
 * The product <For> loop only renders the block at each product's own index, so a block placed after the last product (for example in the right slot of a last row that isn't full) would otherwise never be shown.
 * Blocks in rows below the last product stay hidden, like before: a filtered or short listing shouldn't stack up cards meant for rows further down.
 * Callers should only render these once all products have loaded, otherwise the blocks would jump around while loading more.
 */
export function trailing_content_blocks<T>({
  content_blocks_by_index_,
  rows_by_index_,
  displaced_products_,
  n_cols_currently_showing_,
  product_count,
}: {
  content_blocks_by_index_: readonly (T | T[] | undefined)[];
  rows_by_index_: readonly (readonly number[] | undefined)[];
  displaced_products_: readonly ((undefined | true)[] | number)[];
  n_cols_currently_showing_: number | null;
  product_count: number;
}) {
  const trailing: (T | T[])[] = [];
  if (!n_cols_currently_showing_ || product_count <= 0) return trailing;

  // Find the row the last product lands in: each row has room for the columns that blocks don't take up
  let last_product_row = 0;
  for (let seen_products = 0; ; last_product_row++) {
    const row = displaced_products_[last_product_row];
    const taken_by_blocks = typeof row === "number" ? row : row ? row.filter(item => item).length : 0;
    seen_products += Math.max(0, n_cols_currently_showing_ - taken_by_blocks);
    if (seen_products >= product_count) break;
    // Rows past the ones blocks take up all have room for products, so we're done by then at the latest
    if (last_product_row >= displaced_products_.length + product_count) break;
  }

  for (let i = product_count; i < content_blocks_by_index_.length; i++) {
    const block = content_blocks_by_index_[i];
    if (block === undefined) continue;
    const rows = rows_by_index_[i] || [];
    if (Array.isArray(block) && rows.length > 1) {
      // Several blocks share this index (e.g. the end of one row and the start of the next): keep the ones in the last product's row
      const in_last_row = block.filter((_, j) => rows[j] <= last_product_row);
      if (in_last_row.length) trailing.push(in_last_row);
      continue;
    }
    if ((rows[0] ?? Infinity) > last_product_row) continue; // a row below the last product's row: keep it hidden
    trailing.push(block);
  }
  return trailing;
}

/**
 * Takes a store that contains an array from where index is number of row and value is the result of executing the content block rendering function.
 * Then renders the content and wraps it into a div with the correct styling.
 * Also caps span_columns to max available columns
 */
function wrap_blocks_in_div(rendered_content_blocks: ContentBlocksByRow, max_span_columns: Accessor<number | null>) {
  const get_wrapped_blocks = mapArray(
    () => rendered_content_blocks,
    block => {
      if (!block) return;
      const final_span_columns = createMemo(() => Math.min(block.span_columns, max_span_columns() ?? Infinity));
      // If the item spans an entire row, limit the height to 1 row since there's no concept of "rows" if there are no products beside the block
      const final_span_rows = createMemo(() => (final_span_columns() === max_span_columns() ? 1 : block.span_rows));
      const [rendering_delayed, set_rendering_delayed_] = createSignal(true);

      const content = (
        <Show when={!rendering_delayed()}>
          <div
            class="content-block-wrapper"
            classList={{ "spans-whole-row": final_span_columns() === max_span_columns() }}
            style={{
              "grid-column": `span ${final_span_columns()}`,
              "grid-row": `span ${final_span_rows()}`,
              [spans_columns_variable_name]: final_span_columns(),
            }}
          >
            <RenderContent content={block.content} />
          </div>
        </Show>
      );

      return mergeProps(block, {
        // Create content divs for the blocks with as much fine-grained diffing as possible?
        content: () => {
          // Sneaky on-demand rendering, so we don't render more blocks than we can show: we have the rendered value here and don't return a function that renders because if our block would be moved around we'd be guaranteed to re-render
          // However, no need to count products to know if we should render: the <For> loops in Placeholders and render_displays will only call this function if there's actually a product here that wants to display this block
          // (or, once all products have loaded, ResultsProductCards renders the blocks placed after the last product)
          set_rendering_delayed_(false);
          return content;
        },
        get span_columns() {
          // Cap max width of block to the number of columns available, for everyone downstream
          return final_span_columns();
        },
        get span_rows() {
          return final_span_rows();
        },
      });
    }
  );

  return get_wrapped_blocks;
}

/**
 * Basically adds support for async content block functions and shows a rudimentary placeholder if rendering is delayed. Required due to react having a rendering delay.
 */
function RenderContent(props: { content: () => solid_JSX.Element | Promise<solid_JSX.Element> }) {
  const [resource] = createResource(
    () => props.content, // Could be reactive
    fn => fn()
  );
  createEffect(() => {
    if (resource.error) {
      console.error("Error in content block rendering", resource.error);
    }
  });

  // The suspense is for when there's an async content block (which we have to support due to react having a rendering delay) so that we can show some height while it's loading (should kinda never be visible)
  return (
    <Suspense fallback={<ImagePlaceholder width="100%" height="max(100%, 400px)" />}>
      {resource as unknown as solid_JSX.Element}
    </Suspense>
  );
}
