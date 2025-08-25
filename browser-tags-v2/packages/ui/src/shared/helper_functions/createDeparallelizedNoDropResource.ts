import { Accessor, createEffect, createResource, createSignal } from "solid-js";
import { deparallelize_no_drop } from "@depict-ai/utilishared";

/**
 * A good way of "debouncing" if one wants to update a value as aggressively as possible without overloading the network or the server. It ensures that as many requests are made as possible without making two requests at once.
 * This is for when you need a solid resource that has an accurate .loading value.
 *
 * Creates a sort of debounced/throttled resource - if the dependency changes while the fetcher is not running, the fetcher will instantly run. If the dependency changes while the fetcher is running, the fetcher will not run but a fetch with the dependency value will be queued. If the fetcher is already queued, the queued fetcher will be replaced with the new one. Once the running fetcher finishes, the queued fetcher will run.
 *
 * Caveats: the owner of the fetched might/will be incorrect, the resource will never have an error, instead the resource value will become undefined.
 *
 * @param dependency The value that the fetcher receives, when it updates the fetcher will run according to the rules described above
 * @param fetcher The function that fetches the resource, it receives the dependency value as an argument
 */
export function createDeparallelizedNoDropResource<T, X>(
  dependency: Accessor<T | undefined | null | false>,
  fetcher: (dependency: T) => Promise<X>
) {
  const [promiseOfCurrentFetcherRun, setPromiseOfCurrentFetcherRun] = createSignal<
    Promise<X | undefined> | undefined
  >();
  const deparallelizedFetcher = deparallelize_no_drop(async (dependencyValue: T) => {
    const promise = fetcher(dependencyValue);
    setPromiseOfCurrentFetcherRun(promise); // give the promise of our actually running fetcher to the resource, so it gets an accurate .loading and return value
    return await promise; // await so that deparallelize knows when we're finished and can "unblock" at the right time
  });

  // We can't use the return value of the deparallelized function in createResource because it leads to getting stale data
  // So instead we just call our deparallelized function when we get new data. When the deparallelized function actually runs it makes the resource think it's working with the work that's being done in the deparallelized function
  const [resource] = createResource(promiseOfCurrentFetcherRun, promise => promise);

  createEffect(() => {
    const dependencyValue = dependency();
    if (!dependencyValue) return; // regular createResource also discards falsey values
    deparallelizedFetcher(dependencyValue);
  });

  return resource;
}
