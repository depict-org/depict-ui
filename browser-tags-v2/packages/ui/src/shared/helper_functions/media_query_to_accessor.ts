import { createSignal, onCleanup } from "solid-js";
import { javascript_media_query } from "@depict-ai/utilishared";

/**
 * Use `javascript_media_query` but return a reactive accessor instead of taking a callback function
 */
export function media_query_to_accessor(media_query: string) {
  const signal = createSignal(false);
  onCleanup(javascript_media_query(media_query, ({ matches }) => signal[1](matches)).remove);
  return signal[0];
}
