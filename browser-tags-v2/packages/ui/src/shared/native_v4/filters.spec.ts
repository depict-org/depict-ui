import { describe, expect, it } from "@jest/globals";
import {
  FacetIndex,
  is_resolvable_field,
  native_content_to_v3,
  native_facets_to_v3,
  native_sorts_to_v3,
  NativeFilterError,
  V3RequestFilter,
  v3_filters_to_filter_by,
  v3_sort_to_native,
} from "./filters";
import type { Facet } from "./v4_types";

// Most cases are realtime's own facade tests (v4/worker/src/facade/v3Browse.test.ts), so the browser and the facade
// translate the same v3 filters to the same filter_by.

const values = (
  field: string,
  type: "checkbox" | "swatch" | "hierarchy" | "radio" | "grid",
  title: string,
  vals: string[]
) =>
  ({
    field,
    type,
    title,
    expanded: true,
    values: vals.map((value, index) => ({ value, label: value, count: 9 - index, selected: false })),
  }) as Facet;

const filter_by = (filters: V3RequestFilter[], facets: Facet[] = []) => {
  const index = new FacetIndex();
  index.learn_(facets);
  return v3_filters_to_filter_by(filters, index);
};

describe("v3_filters_to_filter_by", () => {
  it("writes each op as Typesense filter_by over V4's names, ANDed", () => {
    expect(
      filter_by([
        { field: "sale_price", op: "inrange", data: [100, 500] },
        { field: "color#", op: "in", data: ["red", "dark blue"] },
        { field: "fabric", op: "nin", data: ["wool"] },
        { field: "on_sale", op: "eq", data: true },
        { field: "brand", op: "neq", data: "ACME" },
        { field: "rating", op: "geq", data: 4 },
        { field: "weight", op: "leq", data: 2.5 },
      ])
    ).toBe(
      "price:[100..500] && color:=[`red`,`dark blue`] && fabric:!=[`wool`] && on_sale:=true && " +
        "brand:!=`ACME` && rating:>=4 && weight:<=2.5"
    );
  });

  it("skips a filter without data and filters a hierarchical path on its last id", () => {
    expect(
      filter_by([
        { field: "size", op: "in", data: [] },
        { field: "size", op: "in" },
        { field: "category", op: "in", data: [["10", "11"], ["20"]] },
      ])
    ).toBe("category:=[`11`,`20`]");
    expect(filter_by([{ field: "size", op: "in", data: null }])).toBeUndefined();
  });

  it("joins another hierarchy's path with realtime's separator", () => {
    expect(filter_by([{ field: "department", op: "in", data: [["Dam", "Skor"]] }])).toBe("department:=[`Dam # Skor`]");
  });

  it("sends a string true or false bare on every field", () => {
    expect(
      filter_by([
        { field: "on_sale", op: "eq", data: "true" },
        { field: "in_stock", op: "in", data: ["true"] },
        { field: "attr_secondary_display", op: "in", data: ["False"] },
        { field: "brand", op: "eq", data: "truest" },
      ])
    ).toBe("on_sale:=true && in_stock:=[true] && attr_secondary_display:=[false] && brand:=`truest`");
  });

  it("compares on a number sent as a string, geq on the largest of several (discount)", () => {
    expect(
      filter_by([
        { field: "discount", op: "geq", data: ["0.3", "0.4"] },
        { field: "weight", op: "leq", data: "2.5" },
      ])
    ).toBe("discount:>=0.4 && weight:<=2.5");
    expect(() => filter_by([{ field: "weight", op: "leq", data: [1, 2] }])).toThrow(/one value/);
  });

  it("refuses what V4 can't express, as the facade answers a 400", () => {
    expect(() => filter_by([{ field: "size", op: "in", data: ["a`b"] }])).toThrow(NativeFilterError);
    expect(() => filter_by([{ field: "sale_price", op: "inrange", data: [1] }])).toThrow(/inrange/);
    expect(() => filter_by([{ field: "size", op: "eq", data: ["a", "b"] }])).toThrow(/one value/);
    expect(() => filter_by([{ field: "price range", op: "in", data: ["x"] }])).toThrow(/Invalid filter field/);
  });

  it("resolves the lowercased group title depict-ui sends to the facet's field", () => {
    const facets = [
      values("var_color", "swatch", "Färg", ["Green"]),
      values("product_type", "checkbox", "Product type", ["Boxers"]),
      { field: "price", type: "range", title: "Pris", expanded: true, min: 0, max: 100 } as Facet,
    ];
    expect(
      filter_by(
        [
          { field: "färg", op: "in", data: ["Green;#9ea386"] },
          { field: "product%20type", op: "in", data: ["Boxers"] },
          { field: "pris", op: "inrange", data: ["10", "90"] },
        ],
        facets
      )
    ).toBe("var_color:=[`Green`] && product_type:=[`Boxers`] && price:[10..90]");
  });

  it("keeps a configured checkbox's in, whatever op it came with", () => {
    expect(
      filter_by(
        [{ field: "hide in search", op: "neq", data: false }],
        [values("custom.hide_in_search", "checkbox", "Hide in search", ["true", "false"])]
      )
    ).toBe("custom.hide_in_search:=[false]");
  });

  it("strips a colour pill's hex on fi's colour fields and swatch facets, not on the template's composite", () => {
    expect(filter_by([{ field: "colors", op: "in", data: ["svart;#0d0d0d"] }])).toBe("colors:=[`svart`]");
    expect(
      filter_by(
        [{ field: "color_with_hex_list", op: "in", data: ["Svart;#0d0d0d"] }],
        [values("color_with_hex_list", "swatch", "Colour", ["Svart;#0d0d0d"])]
      )
    ).toBe("color_with_hex_list:=[`Svart;#0d0d0d`]");
    expect(filter_by([{ field: "material", op: "in", data: ["Acetate;#123456"] }])).toBe(
      "material:=[`Acetate;#123456`]"
    );
  });
});

describe("is_resolvable_field", () => {
  it("knows served facets by field and title, and the fields that are never a title", () => {
    const index = new FacetIndex();
    index.learn_([values("var_color", "swatch", "Färg", ["Green"])]);
    expect(is_resolvable_field("färg", index)).toBe(true);
    expect(is_resolvable_field("var_color", index)).toBe(true);
    expect(is_resolvable_field("sale_price", index)).toBe(true);
    expect(is_resolvable_field("in_stock", index)).toBe(true);
    expect(is_resolvable_field("storlek", index)).toBe(false);
  });

  it("doesn't take a reserved name for its field before the facets are read: it may be a group title", () => {
    // A filtered link opened in a new page load: iciw's category tree is titled "Category", price "Price".
    const empty = new FacetIndex();
    for (const title of ["category", "brand", "price"]) expect(is_resolvable_field(title, empty)).toBe(false);
    // A toggle carries no group title and sale_price is v3's own name, so neither can be a title.
    for (const field of ["in_stock", "on_sale", "sale_price"]) expect(is_resolvable_field(field, empty)).toBe(true);

    const learned = new FacetIndex();
    learned.learn_([values("product_scollection_category_hierarchy", "hierarchy", "Category", ["Women"])]);
    expect(is_resolvable_field("category", learned)).toBe(true);
    expect(
      v3_filters_to_filter_by(
        [{ field: "category", op: "in", data: [["Women"], ["Women", "Tights & Leggings"]] }],
        learned
      )
    ).toBe("product_scollection_category_hierarchy:=[`Women`,`Women # Tights & Leggings`]");
  });
});

describe("sorts", () => {
  it("names V4's built-in sorts as realtime does, one entry per field and order", () => {
    expect(
      native_sorts_to_v3([
        { field: "relevance", order: "desc", title: "Relevance", selected: true },
        { field: "price", order: "asc", title: "Price, low to high", selected: false },
        { field: "newest", order: "desc", title: "Newest", selected: false },
        { field: "custom", order: "asc", title: "Custom", selected: false },
      ])
    ).toEqual([
      { field: "_relevance", order: "desc", meta: { title: "Relevance", values: ["desc"], names: ["Relevance"] } },
      {
        field: "sale_price",
        order: "asc",
        meta: { title: "Price, low to high", values: ["asc"], names: ["Price, low to high"] },
      },
      { field: "product_timestamp", order: "desc", meta: { title: "Newest", values: ["desc"], names: ["Newest"] } },
      { field: "custom", order: "asc", meta: { title: "Custom", values: ["asc"], names: ["Custom"] } },
    ]);
  });

  it("sends v3's sort with V4's names, and the relevance default as no sort", () => {
    expect(v3_sort_to_native({ field: "_relevance", order: "desc" })).toBeUndefined();
    expect(v3_sort_to_native({ field: "sale_price", order: "asc" })).toEqual({ field: "price", order: "asc" });
    expect(v3_sort_to_native({ field: "product_timestamp", order: "desc" })).toEqual({
      field: "newest",
      order: "desc",
    });
    expect(v3_sort_to_native(undefined)).toBeUndefined();
  });
});

describe("native_facets_to_v3", () => {
  it("lists realtime's filter shape: options in meta, no selection in data, a range's bounds in data", () => {
    expect(
      native_facets_to_v3(
        [
          values("size_name", "grid", "Size", ["S", "M"]),
          values("empty", "checkbox", "Empty", []),
          { field: "price", type: "range", title: "Price", expanded: true, min: 10, max: 90, selected: { min: 20 } },
        ],
        "SEK"
      )
    ).toEqual([
      {
        field: "size_name",
        op: "in",
        meta: { group_title: "Size", type: "checkbox-grid", values: ["S", "M"], counts: [9, 8], names: ["S", "M"] },
        id: "size_name1",
      },
      {
        field: "sale_price",
        op: "inrange",
        data: [10, 90],
        meta: { group_title: "Price", type: "range", min: 10, max: 90, currency: "SEK" },
        id: "sale_price1",
      },
    ]);
  });

  it("serves toggles as eq filters without a group title", () => {
    const [toggle] = native_facets_to_v3(
      [
        {
          field: "on_sale",
          type: "checkbox",
          title: "On sale",
          expanded: true,
          values: [{ value: "true", label: "On sale", count: 9, selected: true }],
        },
      ],
      "SEK"
    );
    expect(toggle).toEqual({
      field: "on_sale",
      op: "eq",
      meta: { type: "checkbox", values: ["true"], counts: [9], names: ["On sale"] },
      id: "on_sale1",
    });
  });

  it("reads a category tree as realtime does: levels trimmed, each path once, none empty", () => {
    const [filter] = native_facets_to_v3(
      [
        values("product_category_hierarchy", "hierarchy", "Kategori", [
          "New Arrivals # New Arrivals - Women ",
          "New Arrivals # New Arrivals - Women",
          "Rea#Kampanj",
          " # ",
        ]),
      ],
      "SEK"
    );
    expect(filter.meta).toMatchObject({
      type: "checkbox-hierarchical",
      values: [
        ["New Arrivals", "New Arrivals - Women"],
        ["Rea", "Kampanj"],
      ],
      counts: [9, 7],
      names: ["New Arrivals - Women", "Kampanj"],
    });
  });

  it("sends a colour facet's swatch slots, and the template's only with one to paint", () => {
    const swatched = {
      ...values("color_name", "swatch", "Färg", ["Black", "Blue"]),
    } as Extract<Facet, { values: unknown }>;
    swatched.values[0].swatch = "#000";
    const [colour, template] = native_facets_to_v3(
      [swatched, values("color_with_hex_list", "swatch", "Colour", ["Svart;#111827"])],
      "SEK"
    );
    expect(colour.meta).toMatchObject({ type: "checkbox-color", swatches: ["#000", null] });
    expect(template.meta).not.toHaveProperty("swatches");
  });
});

describe("native_content_to_v3", () => {
  it("maps content hits to realtime's content links", () => {
    expect(
      native_content_to_v3([
        { title: "Care guide", url: "/care", description: "How to", image_url: "https://img/1.jpg" },
        {
          title: "Returns",
          url: "/returns",
          highlights: [{ field: "title", snippet: "<mark>Ret</mark>", matched_tokens: ["Ret"] }],
        },
      ])
    ).toEqual([
      {
        type: "content_link",
        title: "Care guide",
        description: "How to",
        image_url: "https://img/1.jpg",
        page_url: "/care",
        highlights: [],
      },
      {
        type: "content_link",
        title: "Returns",
        page_url: "/returns",
        highlights: [{ field: "title", snippet: "<mark>Ret</mark>", matched_tokens: ["Ret"] }],
      },
    ]);
  });
});
