import { Accessor } from "solid-js";

/**
 * Expand an object where every value in the top-level is an accessor into a normal object. Used for converting solid_i18n objects into external i18n typed objects.
 */
export const expand_signal_object = <T>(obj: Record<string, Accessor<unknown>>) => {
  return Object.fromEntries(Object.keys(obj).map(key => [key, obj[key]()])) as unknown as T;
};
