// not ideal but can help when debugging via sentry

/**
 * A function that attempts to "serialize" an object to a text representation that helps with debugging when using sentry
 * @param  anything               Something to try to serialize - this function is crappy and your mileage may vary
 * @param  depth                  How deep to go when recursing
 * @return          An object that is somehow closer to text (better serializable by sentry) or text
 */
export function serialize_object(anything: Object, depth?: number) {
  depth ??= 0;
  depth++;
  if (depth > 30) {
    return anything;
  }
  const output = {};
  for (const key in anything) {
    const value = anything[key];
    let serialized_value: any;
    if (value instanceof Element) {
      serialized_value = (value.cloneNode(false) as HTMLElement).outerHTML;
    } else if (value instanceof Headers) {
      serialized_value = Object.fromEntries(value.entries());
    } else if (
      typeof value == "object" &&
      value != null &&
      (typeof value[Symbol.iterator] === "function" || value instanceof Response)
    ) {
      serialized_value = serialize_object(value, depth) as any;
    } else {
      serialized_value = value?.toString?.();
    }
    output[key] = serialized_value;
  }
  return output;
}
