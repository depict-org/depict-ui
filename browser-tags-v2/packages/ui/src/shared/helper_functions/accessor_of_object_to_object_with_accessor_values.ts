import { Accessor, createMemo, untrack } from "solid-js";

// Create a function that takes a generic object that contains any key/values

export function accessor_of_object_to_object_with_accessor_values<O extends Record<string | symbol, any>>(
  obj: Accessor<O>
) {
  const mapfn = <T extends keyof O>(key: T) => [key, createMemo(() => obj()[key] as O[T])] as const;
  const keys = Object.keys(untrack(() => obj())) as Array<keyof O>;
  const mapped_stuff = keys.map(mapfn);
  return Object.fromEntries(mapped_stuff) as unknown as { [K in keyof O]: Accessor<O[K]> }; // FUCK TYPESCRIPT, WHY CAN'T YOU DO THIS CORRECTLY???
}
