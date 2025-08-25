import { relativify } from "./common_noapi";
import { fetch_replacer } from "./fetch_replacement_toolbox";
import { xhr_replace } from "./xhr-replace";
import { err } from "../deprecated/err";
import { dlog } from "../logging/dlog";

export async function default_rp_fixes(orig_url: string | undefined = process.env.ORIG_URL) {
  if (process.env.DEBUG !== "true") {
    return;
  }
  const o_u_u_o = new URL(orig_url || "", location.href);
  const orig_url_with_trailing_slash = o_u_u_o.protocol + "//" + o_u_u_o.host + "/";

  if (orig_url) {
    // change links
    relativify(orig_url_with_trailing_slash, false, location.hostname);

    rp_relativify_fetch(orig_url_with_trailing_slash);

    rp_relativify_xhr(orig_url_with_trailing_slash);

    rp_relativify_history(orig_url_with_trailing_slash);
  } else {
    dlog(new Error("No ORIG_URL env var was set, demo fixes not gonna work."));
  }
}

export function rp_relativify_history(orig_url_with_trailing_slash: string) {
  // rewrite history.pushState and history.replaceState so that it works if someone calls it with absolute URLs
  const hist_proxy = (fn: "replaceState" | "pushState") => {
    const history_prototype = History.prototype;
    history_prototype[fn] = new Proxy(history_prototype[fn], {
      apply(target, this_arg, arg_list) {
        if (typeof arg_list[2] == "string") {
          arg_list[2] = arg_list[2].replaceAll(orig_url_with_trailing_slash, "/");
        }
        return target.apply(this_arg, arg_list);
      },
    });
  };
  (["replaceState", "pushState"] as const).forEach(hist_proxy);
}

export function rp_relativify_fetch(orig_url_with_trailing_slash: string) {
  // rewrite fetch requests just in case, maybe we should also rewrite responses
  fetch_replacer(async (target, this_arg, arg_list) => {
    try {
      const [url] = arg_list;
      if (typeof url == "string") {
        arg_list[0] = url.replaceAll(orig_url_with_trailing_slash, "/");
      } else if (url instanceof Request) {
        if (url.url.includes(orig_url_with_trailing_slash)) {
          arg_list[0] = new Request(url.url.replaceAll(orig_url_with_trailing_slash, "/"), url);
        }
      }
    } catch (e) {
      err(e);
    }
    return target.apply(this_arg, arg_list);
  });
}

export function rp_relativify_xhr(orig_url_with_trailing_slash: string) {
  // rewrite xhr requests just in case
  xhr_replace((request, method, url, arg_array) => {
    if (url instanceof URL) {
      url.href = url.href.replaceAll(orig_url_with_trailing_slash, "/");
    } else if (typeof url == "string") {
      arg_array[1] = url.replaceAll(orig_url_with_trailing_slash, "");
    }
  });
}
