/**
 * Shallowly converts all keys in an object from snake_case to camelCase.
 * Does not support symbol keys.
 *
 * @param obj the object. It will be cloned and not modified in-place.
 */
export function camelCasifyObject<T extends { [key: string]: any }>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key
        .split("_")
        .map((part, index) => (index ? part[0].toUpperCase() + part.slice(1) : part))
        .join(""),
      value,
    ])
  ) as KeysToCamelCase<T>;
}

/**
 * Shallowly converts all keys in an object from camelCase to snake_case.
 * Does not support symbol keys.
 * @param obj the object. It will be cloned and not modified in-place.
 */
export function snakeCasifyObject<T extends { [key: string]: any }>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.replace(/[A-Z]/g, match => "_" + match.toLowerCase()), value])
  ) as KeysToSnakeCase<T>;
}

// Surce: https://gist.github.com/kuroski/9a7ae8e5e5c9e22985364d1ddbf3389d
type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : Lowercase<S>;

type KeysToCamelCase<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K];
};

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? "_" : ""}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S;

type KeysToSnakeCase<T> = {
  [K in keyof T as CamelToSnakeCase<string & K>]: T[K];
};
