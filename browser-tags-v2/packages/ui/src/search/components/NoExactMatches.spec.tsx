import { describe, expect, it, jest } from "@jest/globals";
import { createRoot, createSignal } from "solid-js";
import { render } from "solid-js/web";

jest.mock("@depict-ai/utilishared", () => ({ catchify: (fn: any) => fn }));

import { NoExactMatches, is_similar_products_fallback } from "./NoExactMatches";
import { english_search_translation as en } from "../../locales/english";
import { swedish_search_translation as sv } from "../../locales/swedish";
import type { solid_search_i18n } from "../../locales/i18n_types";

const i18n_from = (locale: object) =>
  Object.fromEntries(Object.entries(locale).map(([key, value]) => [key, () => value])) as unknown as solid_search_i18n;

// The three page kinds a storefront must tell apart (depict-ffm5m).
const exact = { is_fallback: false, n_hits: 2, displays: [{}, {}] };
const similar = { is_fallback: true, n_hits: 3, displays: [{}, {}, {}] };
const none = { is_fallback: false, n_hits: 0, displays: [] };

describe("is_similar_products_fallback", () => {
  it("is true only for a fallback page with products", () => {
    expect(is_similar_products_fallback(exact)).toBe(false);
    expect(is_similar_products_fallback(similar)).toBe(true);
    expect(is_similar_products_fallback(none)).toBe(false);
  });

  it("treats an unknown marker as not a fallback", () => {
    expect(is_similar_products_fallback({ displays: [{}] })).toBe(false);
    expect(is_similar_products_fallback({ is_fallback: null, displays: [{}] })).toBe(false);
    expect(is_similar_products_fallback(undefined)).toBe(false);
    expect(is_similar_products_fallback({ is_fallback: true, displays: [] })).toBe(false);
  });
});

function mount(locale: object, response: Parameters<typeof is_similar_products_fallback>[0]) {
  const container = document.createElement("div");
  createRoot(dispose => {
    const [query] = createSignal("abcde");
    render(
      () => (
        <NoExactMatches
          get_search_query_={query}
          i18n_={i18n_from(locale)}
          is_fallback_={() => is_similar_products_fallback(response)}
        />
      ),
      container
    );
    return dispose;
  });
  return container;
}

describe("NoExactMatches", () => {
  it("shows the notice with the query on a similar-products page", () => {
    const container = mount(en, similar);
    expect(container.innerHTML).toMatchSnapshot();
    expect(container.textContent).toBe("No exact matches for abcde. Showing similar products.");
    expect(container.querySelector(".no-exact-matches")?.getAttribute("role")).toBe("status");
  });

  it("uses the locale translation", () => {
    expect(mount(sv, similar).textContent).toBe("Inga exakta träffar för abcde. Visar liknande produkter.");
  });

  it("shows nothing for exact matches or an empty page", () => {
    expect(mount(en, exact).innerHTML).toBe("");
    expect(mount(en, none).innerHTML).toBe("");
  });

  it("shows nothing when a custom locale has no translation", () => {
    const { get_no_exact_matches_, ...custom } = en;
    expect(get_no_exact_matches_).toBeDefined();
    expect(mount(custom, similar).innerHTML).toBe("");
  });
});

describe("NoExactMatches reactivity", () => {
  it("follows the response and its query, and hides for an empty query", () => {
    const container = document.createElement("div");
    const [query, set_query] = createSignal("abcde");
    const [response, set_response] = createSignal<Parameters<typeof is_similar_products_fallback>[0]>(similar);
    const dispose = render(
      () => (
        <NoExactMatches
          get_search_query_={query}
          i18n_={i18n_from(en)}
          is_fallback_={() => is_similar_products_fallback(response())}
        />
      ),
      container
    );
    expect(container.textContent).toBe("No exact matches for abcde. Showing similar products.");
    set_query("dress");
    set_response(exact);
    expect(container.innerHTML).toBe("");
    set_query("qxzvbn");
    set_response(similar);
    expect(container.textContent).toBe("No exact matches for qxzvbn. Showing similar products.");
    set_query("  ");
    expect(container.innerHTML).toBe("");
    dispose();
  });
});
