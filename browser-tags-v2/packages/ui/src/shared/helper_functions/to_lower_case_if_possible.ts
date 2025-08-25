/**
 * Lower cases a string if possible. Mostly used to make the filter url values case-insensitive.
 */
export function to_lower_case_if_possible<T>(stuff: T) {
  if (typeof stuff !== "string") return stuff;
  return stuff.toLowerCase();
}
