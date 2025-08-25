import { Accessor, createComputed, createSignal } from "solid-js";
import { catchify, queueMacroTask } from "@depict-ai/utilishared";

/**
 * Like createMemo but the returned memo will update to the changes made to it just before rendering in the current task queue iteration (or if the browser won't render this iteration it just queues it as a task). The goal "batch" that the memo might depend on multiple signals which depend on multiple events which are multiple tasks.
 * See https://github.com/solidjs/solid/discussions/1375
 */
export function createBatchedMemo<T>(fn: () => T) {
  const [external_value, set_external_value] = createSignal<T>();
  const [is_loading, set_is_loading] = createSignal(false);
  let last_queued: {};
  let last_value: T;
  let initial_run = true;

  createComputed(
    catchify(async () => {
      last_value = fn();
      if (initial_run) {
        initial_run = false;
        set_external_value(() => last_value);
      } else {
        const us = {};
        last_queued = us;
        set_is_loading(true);
        await new Promise<void | DOMHighResTimeStamp>(r => {
          // want this to happen ASAP but earliest after the next task in the macrotask queue
          requestAnimationFrame(r); // to ensure this happens before rendering
          queueMacroTask(r); // to ensure it happens next event loop execution even if the browser doesn't decide to paint after it
        });
        if (last_queued !== us) {
          return; // basically the equivalent of canceling the last timeout, we want to wait a macrotask until there's a macrotask of no new information
        }
        set_external_value(() => last_value);
        set_is_loading(false);
      }
    })
  );
  Object.defineProperty(external_value, "loading", {
    get() {
      return is_loading();
    },
  });
  return external_value as Accessor<T> & { loading: boolean };
}
