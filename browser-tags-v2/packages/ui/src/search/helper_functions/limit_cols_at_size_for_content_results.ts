import { SDKColsAtSize } from "../../shared/helper_functions/cols_at_size_transformer/cols_at_size_transformer";

/**
 * Content results ContentCard look stupid on mobile if there are two columns of them, so we limit the number of columns to 1 if the screen is too small
 */
export function limit_cols_at_size_for_content_results(
  sdk_cols_at_size: SDKColsAtSize,
  min_width_for_more_than_one_column = 500
): SDKColsAtSize {
  if (!sdk_cols_at_size.length) return sdk_cols_at_size;

  const sorted_sizes = sdk_cols_at_size
    .map(([cols, max_width]) => [cols, max_width ?? Infinity])
    .sort(([, a], [, b]) => a - b);

  const [[, smallest_max_width]] = sorted_sizes;

  if (smallest_max_width > min_width_for_more_than_one_column) {
    // If everything above min_width_for_more_than_one_column, we can just add a 1 column at the beginning
    return [[1, min_width_for_more_than_one_column], ...sdk_cols_at_size];
  }

  const to_delete: number[] = [];
  for (let i = 0; i < sorted_sizes.length; i++) {
    const [, max_width] = sorted_sizes[i];
    if (max_width > min_width_for_more_than_one_column) continue;
    to_delete.push(i);
  }
  while (to_delete.length) {
    sorted_sizes.splice(to_delete.pop()!, 1);
  }
  sorted_sizes.unshift([1, min_width_for_more_than_one_column]);

  return sorted_sizes.map(([cols, max_width]) => (max_width == Infinity ? [cols] : [cols, max_width]));
}
