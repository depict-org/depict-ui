import { async_iterable_ipns, IPNS } from "./async_iterable_ipns";
import { catchify } from "../../logging/error";

/**
 * Like Promise.any but for async iterable infinite promises (object that have `.state` and a [Symbol.asyncIterator]). Returns an array of all current values when one value udpates.
 * @param  iterables               Array of IPNS
 * @return                  IPNS that resolves with an array of the values of all provided IPNS when one of them resolves
 */

export function zip_async_iterables<T extends any[]>(iterables: IPNS<T[keyof T]>[]): IPNS<T> {
  const ourselves = async_iterable_ipns<T>();
  const values = new Array(iterables.length) as T;

  Promise.all(
    iterables.map(
      catchify(async (iterable, index) => {
        for await (const value of iterable) {
          values[index] = value;
          ourselves([...values] as T);
        }
      })
    )
  ).then(catchify(ourselves.exit));

  return ourselves;
}
