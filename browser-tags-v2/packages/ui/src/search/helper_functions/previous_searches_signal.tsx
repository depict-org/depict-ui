import { Accessor, createComputed, createEffect, createSignal, untrack } from "solid-js";
import { catchify } from "@depict-ai/utilishared";

/**
 * Returns a signal that reads and writes localStorage.depict_searches, used for storing the previous searches. Won't update when localStorage is updated by something else.
 */
export function make_previous_searches_signal(read_search_query: Accessor<string>) {
  const ls = globalThis?.localStorage || {};
  const key = "depict_searches";
  const previous_searches = createSignal(JSON.parse(ls[key] || "[]") as string[]);
  const [read_previous_searches, write_previous_searches] = previous_searches;

  createEffect(
    catchify(() => {
      const json_encoded = JSON.stringify(read_previous_searches());
      if (ls[key] !== json_encoded) {
        ls[key] = json_encoded;
      }
    })
  );

  createComputed(
    catchify(() => {
      const searches = untrack(read_previous_searches);
      const current_query = read_search_query();
      if (!current_query) {
        // don't save no query in history
        return;
      }
      const new_value = [...searches.filter(value => value !== current_query), current_query].slice(-30); // keep max 30 values (one could be deleted later because it's the search query), if value we add already exists remove it first
      write_previous_searches(new_value);
    })
  );
  return previous_searches;
}
