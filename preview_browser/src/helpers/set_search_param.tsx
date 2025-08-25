import { Accessor, createEffect, getOwner, runWithOwner } from "solid-js";
import { useNavigate } from "@solidjs/router";

/**
 * Solid-start's useSearchParams is buggy, we do our own instead
 */
export function use_set_search_param(is_actually_routing: Accessor<boolean>) {
  const navigate = useNavigate();
  const owner = getOwner()!;

  return (param: string, value?: string, replace: boolean = false) =>
    runWithOwner(owner, () =>
      createEffect<boolean>(job_done => {
        if (job_done) return true;
        const ir = is_actually_routing();
        if (ir) return false;

        attempt_navigation: {
          const u_o = new URL(location.href);
          const { searchParams } = u_o;
          if (value == undefined) {
            if (!searchParams.has(param)) break attempt_navigation;
            searchParams.delete(param);
          } else {
            if (searchParams.get(param) === value) break attempt_navigation;
            searchParams.set(param, value);
          }
          console.log(
            "param changed",
            { param, value, replace },
            ", navigating to",
            u_o.pathname + u_o.search + u_o.hash,
            "from",
            location.pathname + location.search + location.hash
          );
          navigate(u_o.pathname + u_o.search + u_o.hash, {
            scroll: false,
            replace,
          });
        }

        return true; // So we don't run again
      }, false)
    );
}
