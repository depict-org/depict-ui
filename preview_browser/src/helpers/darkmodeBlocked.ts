import { createSignal, createRoot } from "solid-js";
import { media_query_to_accessor } from "@depict-ai/ui/latest";

export const darkmodeBlocked = createSignal(localStorage.darkmodeBlocked !== "false");
export const osDark = createRoot(() => media_query_to_accessor("(prefers-color-scheme: dark)"));
