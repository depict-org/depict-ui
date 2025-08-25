import { useLocation } from "@solidjs/router";
import { createMemo } from "solid-js";

export function get_location_href() {
  const fake_location = useLocation();
  return createMemo(() => location.origin + fake_location.pathname + fake_location.search + fake_location.hash);
}
