/**
 * Recursively sorts the keys in an object (NOT in-place, returns a new object). Do not provide objects containing anything other than primitives or other objects. Do not provide objects that have cyclical values.
 */

export function sort_obj<T>(maybe_obj: T) {
  if (!maybe_obj) {
    return maybe_obj;
  }
  if (typeof maybe_obj != "object") {
    return maybe_obj;
  }
  if ((maybe_obj as any).constructor !== Object) {
    if (Array.isArray(maybe_obj)) {
      return maybe_obj.map(item => sort_obj(item));
    }
    return maybe_obj;
  }
  const cloned_obj = {} as T;
  const sorted_keys = Object.keys(maybe_obj).sort();
  for (let i = 0; i < sorted_keys.length; i++) {
    const key = sorted_keys[i];
    const value = maybe_obj[key];
    cloned_obj[key] = sort_obj(value);
  }
  return cloned_obj;
}
