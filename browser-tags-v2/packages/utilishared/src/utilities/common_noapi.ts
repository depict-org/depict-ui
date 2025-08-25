import { patched_querySelectorAll } from "./patched_querySelectorAll";
import { ElementObserver, ElementObserverEvent, observer } from "../element-observer";
import { Node_Iterable } from "../rendering/recommendation-renderer/types";
import { catchify, report } from "../logging/error";
import { dlog } from "../logging/dlog";

export function ensure_parameter_in_url(url, param, value) {
  const url_object = new URL(url),
    search_params = new URLSearchParams(url_object.search);
  search_params.set(param, value);
  return url_object.origin + url_object.pathname + "?" + search_params.toString();
}

export function querySelectorUpwards(element: Element | HTMLElement, selector: string) {
  let result: Element | HTMLElement | null = null;
  while (!result && element) {
    element = element?.parentNode as HTMLElement;
    result =
      element?.querySelector(selector) || (element?.matches ? (element.matches(selector) ? element : null) : null);
  }
  return result;
}
export function html2elems(html: string) {
  // need to wrap the HTML into a <body> tag because the browser otherwise automatically puts <style> into head and we can't return it
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")?.body?.childNodes;
}
export function html2elem(html: string) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")?.body?.firstElementChild;
}
/** On demo domain: make all urls relative */
export function relativify(
  url: string | RegExp,
  also_onchange = false,
  override_dev_url = "demo.depict.ai",
  stfu = true,
  also_in_all_shadow_roots = false
) {
  if (process.env.DEBUG === "true" && location.href.includes(override_dev_url)) {
    const relativ_callback = catchify((event: ElementObserverEvent) => {
      const anchor = event.element as HTMLAnchorElement;
      if (typeof url === "string") {
        if (anchor.href.includes(url)) {
          if (!stfu) {
            dlog("RUNNING RELATIVIFY on", event);
          }
          anchor.href = anchor.href.replaceAll(url, "/");
        }
      } else {
        if (url.test(anchor.href)) {
          if (!stfu) {
            dlog("RUNNING RELATIVIFY on", event);
          }
          anchor.href = anchor.href.replace(url, "/");
        }
      }
    });
    const link_sel = "a[href]";
    observer.onexists(link_sel, relativ_callback);
    if (also_onchange) {
      observer.onchange(link_sel, relativ_callback);
    }
    if (also_in_all_shadow_roots && typeof ShadowRoot == "function") {
      observer.onexists<HTMLElement>(
        "*",
        catchify(({ element }) => {
          if (element?.shadowRoot instanceof ShadowRoot) {
            const local_observer = new ElementObserver({
              territory: element.shadowRoot,
            });
            local_observer.onexists(link_sel, relativ_callback);
          }
        })
      );
    }
  }
}

export function querySelectorAllElements<T extends Element>(elements: Node_Iterable, selector: string): T[] {
  const matches: T[] = [];
  for (const element of elements) {
    if ("querySelectorAll" in element) {
      matches.push(...patched_querySelectorAll<T>(element, selector)!);
    }
    if ("matches" in element && element.matches?.(selector)) {
      matches.push(element as T);
    }
  }
  return matches;
}

export function standard_price_format(
  price: number,
  places_after_comma: number | "auto" = 2,
  decimal_delimiter = ",",
  thousands_delimiter = String.fromCharCode(160) // Non-breaking space (&nbsp;)
) {
  if (!price && price !== 0) {
    return "";
  }
  if (typeof price === "string") {
    if (!isNaN(price)) {
      report(new Error("standard_price_format did not expect price as a string"), "warning", { price });
      price = parseFloat(price);
    } else {
      report(new Error("standard_price_format cannot handle price string"), "error", { price });
      return "";
    }
  }

  if (places_after_comma == "auto") {
    places_after_comma = price % 1 ? 2 : 0;
  }

  // Generalized rounding for any value of places_after_comma.
  const multiplier = Math.pow(10, places_after_comma);
  price = Math.round(price * multiplier) / multiplier;

  const fixed = places_after_comma < 0 ? price.toString().split(".") : price.toFixed(places_after_comma).split("."),
    [...chars] = fixed[0],
    reversed = chars.reverse();
  let j,
    reversed_formatted: string[][] = [];
  for (let i = 0; i < reversed.length; i++) {
    if (!(i % 3)) {
      j = reversed_formatted.push([reversed[i]]) - 1;
    } else {
      reversed_formatted[j].push(reversed[i]);
    }
  }
  fixed[0] = reversed_formatted
    .map(v => v.reverse().join(""))
    .reverse()
    .join(thousands_delimiter);
  return fixed.join(decimal_delimiter);
}

export function intl_number_format_with_fallback(
  bcp47_country_code: string,
  number: number,
  numberformat_options?: Parameters<typeof Intl.NumberFormat>[1]
) {
  const numfmt = window?.Intl?.NumberFormat;
  if (numfmt) {
    return new numfmt(bcp47_country_code, numberformat_options)?.format?.(number);
  }
  return standard_price_format(number, "auto");
}

export function ensure_object_path(obj: object, step1: string, ...path: string[]) {
  if (typeof obj[step1] === "undefined") {
    obj[step1] = {};
  }
  if (path.length) {
    return ensure_object_path(obj[step1], ...(path as [string, ...string[]]));
  } else {
    return obj[step1];
  }
}
