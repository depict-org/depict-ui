import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DepictAPI } from "./DepictAPI";
import * as IdTypes from "../category_listing/IdTypes";

// DepictAPI's network step is overridable (request_raw_, for NativeDepictAPI). These pin what the v3 default sends.

let fetch_mock: jest.Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const base = { merchant: "demo", market: "se", locale: "sv_SE", session_id: "s1" };

beforeEach(() => {
  fetch_mock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  globalThis.fetch = fetch_mock as unknown as typeof fetch;
});

describe("DepictAPI (v3)", () => {
  it("POSTs a search to /v3/search/results with the request as its body", async () => {
    fetch_mock.mockResolvedValueOnce(
      json({ n_hits: 1, displays: [{ variant_index: 0, variant_displays: [{}] }], search_request_id: "r" })
    );
    const result = await new DepictAPI({}).query({ ...base, query: "v3 search" });
    const [url, init] = fetch_mock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/api\.depict\.ai\/v3\/search\/results\?/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ ...base, query: "v3 search" });
    expect(result.n_hits).toBe(1);
  });

  it("GETs a listing header with the request in the query string", async () => {
    fetch_mock.mockResolvedValueOnce(
      json({ listing_id: "l1", title: "T", ancestors: [], siblings: [], children: [], content_blocks: [] })
    );
    const result = await new DepictAPI({}).get_listing({
      ...base,
      id_to_query_for_: "19",
      id_type_: IdTypes.EXTERNAL_ID,
    });
    const [url, init] = fetch_mock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/api\.depict\.ai\/v3\/listings\/external_id\/19\?.*merchant=demo/);
    expect(init?.method).toBe("GET");
    expect(result).toMatchObject({ listing_id: "l1", breadcrumbs: [], quick_links: [] });
  });

  it("serves the fallback response on a non-200", async () => {
    fetch_mock.mockResolvedValue(json({ detail: "bad" }, 422));
    const result = await new DepictAPI({}).query({ ...base, query: "v3 failing" });
    expect(result).toMatchObject({ failed: true, n_hits: 0, displays: [] });
  });

  it("GETs suggestions from /v3/search/suggestions", async () => {
    fetch_mock.mockResolvedValueOnce(json({ suggestions_request_id: "r", suggestions: [] }));
    const result = await new DepictAPI({}).suggest({ ...base, query: "sh" });
    expect(String(fetch_mock.mock.calls[0][0])).toMatch(
      /^https:\/\/api\.depict\.ai\/v3\/search\/suggestions\?.*query=sh/
    );
    expect(result).toEqual({ suggestions_request_id: "r", suggestions: [] });
  });
});
