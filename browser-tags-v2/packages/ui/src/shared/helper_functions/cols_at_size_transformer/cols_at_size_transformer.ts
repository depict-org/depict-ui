import { ColAtSize, ColsAtSize } from "@depict-ai/utilishared";

export type SDKColsAtSize = [number, number?][];

const transform_elements = (sorted_cols_at_size: SDKColsAtSize): ColAtSize[] => {
  const cols_at_size: ColAtSize[] = [];

  for (let i = 0; i < sorted_cols_at_size.length; i++) {
    const [nb_cols, width] = sorted_cols_at_size[i];
    const next_width = sorted_cols_at_size[i + 1]?.[1];
    const max_width = i === 0 ? "" : `${width}px`;
    const min_width = next_width !== undefined ? `${next_width + 1}px` : "";

    const col_at_size: ColAtSize = [nb_cols, min_width, max_width];

    cols_at_size.push(col_at_size);
  }

  return cols_at_size;
};

/**
 * Transform SDK ColsAtSize into valid Layout ColsAtSize
 * @param cols_at_size [nbCol, maxWidth]
 * @returns
 */
export const convert_sdk_cols_at_size_to_layout = (cols_at_size: SDKColsAtSize): ColsAtSize => {
  // Check that every element is an array
  const are_arrays = cols_at_size?.every?.(element => Array.isArray(element));
  if (!are_arrays) {
    throw new Error("Every element in cols_at_size must be an array");
  }

  // Check width duplicates
  const widths = cols_at_size.map(([_, width]) => width);
  const widths_set = new Set(widths);
  if (widths_set.size < widths.length) {
    throw new Error("There are duplicate widths in cols_at_size");
  }

  if (cols_at_size.length === 1) {
    const [nb_cols, width] = cols_at_size[0];

    const max_width = width !== undefined ? `${width}px` : "";

    return [[nb_cols, "", max_width]];
  }

  // Sort widths in ascending order
  const sorted_cols_at_size = [...cols_at_size].sort((a, b) => {
    const [_b, width_A] = a;
    const [_a, width_b] = b;

    if (width_A === undefined) {
      return -1;
    }
    if (width_b === undefined) {
      return 1;
    }

    return width_b - width_A;
  });

  return transform_elements(sorted_cols_at_size);
};
