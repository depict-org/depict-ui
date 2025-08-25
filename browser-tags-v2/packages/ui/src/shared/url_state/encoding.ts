import { base64_decode_unicode, base64_encode_unicode, dlog } from "@depict-ai/utilishared";
import { SortModel } from "@depict-ai/types/api/SearchRequestV3";
import { FilterWithData } from "../types";

const fallback_operator = "in" as const satisfies FilterWithData["op"];
const fallback_token = "";
const legacy_filter_prefix = "filter_";

const operator_map = {
  "eq": "≡",
  "neq": "≠",
  "in": "∈",
  "nin": "∉",
  "leq": "≤",
  "geq": "≥",
  "inrange": "🔢",
} as const;

const ascending_token = "📈";
const descending_token = "📉";

const range_delimiter = "-";
const string_item_delimiter = "‚"; // This is not a comma but a comma-like character that browsers will render in the URL bar.
const array_item_delimiter = "‣"; // FIXME: decide on a character. Could theoretically be a double string delimiter.
const empty_item_replacement = "0️⃣";

const op_to_token = <T extends keyof typeof operator_map>(
  op: T
): T extends typeof fallback_operator ? typeof fallback_token : (typeof operator_map)[T] => {
  if (op === fallback_operator) return fallback_token as any;
  return operator_map[op] as any;
};

/**
 * Checks if a given array of filter data can be neatly serialized into an URL query parameter, or if it should fall back to JSON+base64.
 * The requirements are either an array of strings, containing no reserved characters, or an array of arrays of strings, containing no reserved characters.
 * No deep or mixed nesting levels are supported.
 */
function array_is_serializable(array: FilterWithData["data"][], is_root = true): boolean {
  if (array.every(item => Array.isArray(item))) {
    if (!is_root) {
      // Deeply nested arrays are not supported, but also don't exist as filters (yet)
      return false;
    }
    return (array as (string | number)[][]).every(item => array_is_serializable(item, false));
  }

  if (array.some(item => typeof item !== "string")) {
    // Numbers are not supported, since 1 and "1" would encode to the same thing
    return false;
  }

  // Encoding reserved characters is not supported
  return !(array as string[]).some(
    item =>
      item.includes(array_item_delimiter) || item.includes(string_item_delimiter) || item === empty_item_replacement
  );
}

/**
 * Human readable string[] or string[][] serialization for URLs.
 * @param array
 * @returns
 */
function encode_array(array: (string | string[])[]): string {
  const is_nested = array.every(item => Array.isArray(item));

  if (is_nested) {
    return (array as string[][]).map(encode_array).join(array_item_delimiter) + array_item_delimiter; // Nested arrays require a suffix to close nesting levels
  }

  return array.map(item => (item === "" ? empty_item_replacement : item)).join(string_item_delimiter);
}

function decode_array(encoded_array: string): string[] | string[][] {
  const is_nested = encoded_array.includes(array_item_delimiter);

  if (is_nested) {
    return encoded_array
      .split(array_item_delimiter)
      .filter(s => s !== "") // Remove empty segments, caused by trailing delimiter
      .map(decode_array) as string[] | string[][];
  }

  return encoded_array
    .split(string_item_delimiter)
    .filter(s => s !== "") // Remove empty segments, caused by trailing delimiter in the single item special case
    .map(item => (item === empty_item_replacement ? "" : item));
}

function encode_filter_data(op: FilterWithData["op"], data: FilterWithData["data"]): string {
  if (data === "true") {
    // boolean encoding
    return "1";
  }

  if (data === "false") {
    // boolean encoding
    return "0";
  }

  const data_is_array = Array.isArray(data);

  if (op === "inrange" && data_is_array && (data as any[]).every(item => typeof item === "number")) {
    // numeric range filter encoding
    return data.join(range_delimiter);
  }

  if (data_is_array && array_is_serializable(data)) {
    const encoded_data = encode_array(data as string[] | string[][]);
    if (!encoded_data.includes(array_item_delimiter) && !encoded_data.includes(string_item_delimiter)) {
      // A string[] with only one item will encode without delimiters, which is indistinguishable from a plain string during decoding
      // In that case we add a delimiter suffix at the end
      return encoded_data + string_item_delimiter;
    }

    return encoded_data;
  }

  // Fallback encoding
  return base64_encode_unicode(JSON.stringify(data));
}

function decode_filter_data(op: FilterWithData["op"], encoded_data: string): FilterWithData["data"] | null {
  if (encoded_data === "1") {
    return "true";
  }
  if (encoded_data === "0") {
    return "false";
  }

  if (op === "inrange" && encoded_data.includes(range_delimiter)) {
    return encoded_data.split(range_delimiter).map(x => parseFloat(x));
  }

  if (encoded_data.includes(string_item_delimiter) || encoded_data.includes(array_item_delimiter)) {
    return decode_array(encoded_data);
  }

  try {
    return JSON.parse(base64_decode_unicode(encoded_data)!);
  } catch (e) {
    dlog("Failed to fallback parse filter data", op, encoded_data, e);
  }

  return null;
}

/**
 * Function that encodes a filter object into query parameters and sets them on the given URLSearchParams object.
 */
export function encode_filters(
  filters: FilterWithData[],
  search_params: URLSearchParams,
  filter_query_param_prefix: string
) {
  for (const filter of filters) {
    const { field, op, data } = filter;
    const encoded_data = encode_filter_data(op, data);
    search_params.set(filter_query_param_prefix + field + op_to_token(op), encoded_data);
  }
}

/**
 * Function that decodes the filters from the provided query parameters and returns them as an array of filter objects.
 */
export function decode_filters(search_params: URLSearchParams, filter_query_param_prefix: string): FilterWithData[] {
  const found_filters: FilterWithData[] = [];

  for (const key of search_params.keys()) {
    // Allow for backwards compatibility with the old filter query param prefix
    let chosen_prefix = filter_query_param_prefix;
    if (!key.startsWith(chosen_prefix)) {
      chosen_prefix = legacy_filter_prefix;
      if (!key.startsWith(chosen_prefix)) {
        continue;
      }
    }

    const encoded_data = search_params.get(key);
    if (!encoded_data) {
      continue;
    }

    const [op, token] = (Object.entries(operator_map).find(([, token]) => key.endsWith(token)) || [
      fallback_operator,
      fallback_token,
    ]) as [FilterWithData["op"], (typeof operator_map)[keyof typeof operator_map] | typeof fallback_token];

    const data = decode_filter_data(op, encoded_data);
    if (!data) {
      continue;
    }

    const field = key.slice(chosen_prefix.length, token ? -token.length : undefined);
    found_filters.push({
      field,
      op,
      data,
    });
  }

  return found_filters;
}

/**
 * Function that encodes a sort model into a query paremeter and sets them on the given URLSearchParams object.
 */
export function encode_sorting(
  sorting: SortModel | undefined,
  search_params: URLSearchParams,
  sorting_query_param: string
) {
  if (!sorting) {
    return;
  }

  const { field, order } = sorting;
  const ascending = order === "asc";
  search_params.set(sorting_query_param, field + (ascending ? ascending_token : descending_token));
}

/**
 * Function that decodes the sort model from the provided query parameters and returns it as a sort model, if present.
 */
export function decode_sorting(search_params: URLSearchParams, sorting_query_param_: string): SortModel | undefined {
  const encoded_sorting = search_params.get(sorting_query_param_);

  if (!encoded_sorting) {
    return;
  }

  if (encoded_sorting.endsWith(ascending_token)) {
    return {
      field: encoded_sorting.slice(0, -ascending_token.length),
      order: "asc",
    };
  }
  if (encoded_sorting.endsWith(descending_token)) {
    return {
      field: encoded_sorting.slice(0, -descending_token.length),
      order: "desc",
    };
  }

  dlog("Invalid sorting query param value", encoded_sorting);
  return;
}

/**
 * Remove all Depict filter/sorting query parameters from the given URLSearchParams object.
 * Used to reset the URLSearchParams object to a clean state, before adding new filters/sorting.
 * @param search_params
 * @param filter_query_param_prefix Prefix of the filter query parameters
 * @param sorting_query_param
 */
export function strip_encoded_filter_and_sort(
  search_params: URLSearchParams,
  filter_query_param_prefix: string,
  sorting_query_param: string
) {
  // We'll be modifying the URLSearchParams object, so we need to make a copy of the keys first
  const keys = [...search_params.keys()];

  for (const key of keys) {
    if (
      key.startsWith(filter_query_param_prefix) ||
      key === sorting_query_param ||
      key.startsWith(legacy_filter_prefix)
    ) {
      search_params.delete(key);
    }
  }
}

export const sideways_clearing_url_hash = "#went_sideways_clear_filters";

/**
 * Transfer the encoded sort and filter parameters from a URLSearchParams to another URLSearchParams or URL string.
 * @property to_url URL to apply the encoded sort and filter parameters to
 * @property set_clearing_flag_ If true, the sideways_url_params_flag will be set to true on the target URL
 * @property from_search_params_ URLSearchParams to read the encoded sort and filter parameters from, defaults to the current ones
 * @property sorting_query_param_ Query parameter name for the encoded sorting
 * @property filter_query_param_prefix_ Prefix for the encoded filter query parameters
 * @returns
 */
export function transfer_encoded_sort_and_filter<T extends string | URL | undefined>({
  to_url_,
  set_clearing_flag_,
  from_search_params_ = new URLSearchParams(location.search),
  sorting_query_param_,
  filter_query_param_prefix_,
}: {
  to_url_: T;
  set_clearing_flag_?: boolean;
  from_search_params_?: URLSearchParams;
  sorting_query_param_: string;
  filter_query_param_prefix_: string;
}): T {
  if (!to_url_) return to_url_;

  const was_url_object = to_url_ instanceof URL;
  const url_object = was_url_object ? to_url_ : new URL(to_url_, location.origin);
  const { searchParams } = url_object;
  let transferredAnyFilters = false;

  if (from_search_params_.has(sorting_query_param_)) {
    searchParams.set(sorting_query_param_, from_search_params_.get(sorting_query_param_)!);
  }

  for (const key of from_search_params_.keys()) {
    if (key.startsWith(filter_query_param_prefix_)) {
      searchParams.set(key, from_search_params_.get(key)!);
      transferredAnyFilters = true;
    }
  }

  if (set_clearing_flag_ && transferredAnyFilters) {
    url_object.hash = sideways_clearing_url_hash;
  }

  if (was_url_object) {
    return url_object as T;
  }
  return url_object.href as T;
}
