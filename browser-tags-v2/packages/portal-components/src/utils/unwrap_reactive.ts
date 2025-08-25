/**
 * Like solid's unwrap but it's reactive. Needed because one can't just save a property in a store and later re-assign it to the same thing because one doesn't get a reference to a property but rather a proxy to it, which's value will update.
 * Kudos to GPT
 */
export function unwrap_reactive(obj: any, hash = new WeakMap()): any {
  if (obj === null || obj === undefined) return obj; // If the object is null or undefined, return it as is

  if (obj instanceof Date) return new Date(obj); // Date object
  if (obj instanceof RegExp) return new RegExp(obj); // Regular Expression object
  if (typeof obj !== "object") return obj; // If the object is not an object (i.e., primitive), return it as is

  if (hash.has(obj)) return hash.get(obj); // If this object has been seen before, return the new object reference

  const result = obj instanceof Array ? [] : {}; // Create a new object or array
  hash.set(obj, result); // Set the new object reference in the hash

  // Recursively copy properties from the original object to the new one
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = unwrap_reactive(obj[key], hash);
    }
  }

  return result;
}
