import isEqual from "lodash/isEqual";

import {
  decode_filters,
  decode_sorting,
  encode_filters,
  encode_sorting,
  strip_encoded_filter_and_sort,
  transfer_encoded_sort_and_filter,
} from "./encoding";
import { FilterWithData } from "../types";
import { SortModel } from "@depict-ai/types/api/SearchRequestV2";

const filter_query_param_prefix_ = "filter_";
const sorting_query_param_ = "sorting";

function filter_roundtrip_is_equal(filters: FilterWithData[]) {
  const encoded_params = new URLSearchParams();
  encode_filters(filters, encoded_params, filter_query_param_prefix_);
  const decoded = decode_filters(encoded_params, filter_query_param_prefix_);
  // Filter order doesn't matter.
  filters.sort();
  decoded.sort();

  return isEqual(decoded, filters);
}

function sorting_roundtrip_is_equal(sorting: SortModel | undefined) {
  const encoded_params = new URLSearchParams();
  encode_sorting(sorting, encoded_params, sorting_query_param_);
  const decoded = decode_sorting(encoded_params, sorting_query_param_);

  return isEqual(decoded, sorting);
}

describe("Filter encoder", () => {
  // To add a new test, reproduce the bug in a browser, open the Network tab,
  // find a request to api.depict.ai using that filter, open the Payload tab,
  // right click "filters" and "Copy value".
  it("Should decode the same category filters as it encoded", () => {
    const filters = [
      {
        "data": [
          ["Accessoarer", "Skor"],
          ["Accessoarer", "Skor", "Sneakers"],
          ["Accessoarer", "Skor", "Kängor"],
          ["Accessoarer", "Skor", "Oxfordskor"],
          ["Accessoarer", "Skor", "Tofflor"],
          ["Accessoarer", "Skor", "Loafers"],
          ["Kläder", "Byxor", "Linnebyxor"],
        ],
        "field": "categories_filtered",
        "op": "in",
      },
    ] as FilterWithData[];

    expect(filter_roundtrip_is_equal(filters)).toBeTruthy();
  });

  it("Should decode the same filters as it encoded", () => {
    const filters = [
      {
        "data": [
          ["Kläder", "Kavajer"],
          ["Kläder", "Kavajer", "Tweedkavajer"],
          ["Kläder", "Kavajer", "Flanellkavajer"],
          ["Kläder", "Kavajer", "Dubbelknäppta kavajer"],
          ["Kläder", "Kavajer", "Linnekavajer"],
          ["Kläder", "Kavajer", "Enkelknäppta kavajer"],
        ],
        "field": "categories_filtered",
        "op": "in",
      },
      {
        "data": [20, 10000],
        "field": "sale_price",
        "op": "inrange",
      },
      {
        "data": ["152", "150"],
        "field": "sizes_in_stock",
        "op": "in",
      },
      {
        "data": ["Blå"],
        "field": "color",
        "op": "in",
      },
      {
        "data": ["Button down", "Regular krage"],
        "field": "collar",
        "op": "in",
      },
      {
        "data": "true",
        "field": "is_second_hand",
        "op": "eq",
      },
    ] as FilterWithData[];

    expect(filter_roundtrip_is_equal(filters)).toBeTruthy();
  });

  it("Should decode the same edge case filters as it encoded", () => {
    const filters = [
      {
        "data": [["Kläder"]],
        "field": "nested_single",
        "op": "in",
      },
      {
        "data": [[[["Kläder"]]], [[["Kläder", "Herr"]]]],
        "field": "deeply_nested",
        "op": "in",
      },
      {
        "data": [[[["Kläder"]]], [["Kläder", "Herr"], "Kavajer"]],
        "field": "unevenly_nested",
        "op": "in",
      },
      {
        "data": ["152", "S‚M"],
        "field": "reserved_string_delimiter",
        "op": "in",
      },
      {
        "data": [""],
        "field": "empty_string",
        "op": "in",
      },
      {
        "data": ["¤", "Regular krage"],
        "field": "reserved_array_delimiter",
        "op": "in",
      },
    ] as FilterWithData[];

    expect(filter_roundtrip_is_equal(filters)).toBeTruthy();
  });
});

describe("Sorting encoder", () => {
  it("Should decode the same sort model as it encoded", () => {
    const sort = {
      order: "asc",
      field: "sale_price",
    } as SortModel;

    expect(sorting_roundtrip_is_equal(sort)).toBeTruthy();
  });

  it("Should decode the same undefined model as it encoded", () => {
    const sort = undefined;

    expect(sorting_roundtrip_is_equal(sort)).toBeTruthy();
  });
});

describe("Encoding stripper", () => {
  it("Should remove all encoded params, but keep others", () => {
    const sort = {
      order: "asc",
      field: "title",
    } as SortModel;

    const filters = [
      {
        "data": [["Accessoarer", "Skor"]],
        "field": "categories_filtered",
        "op": "in",
      },
    ] as FilterWithData[];

    const search_params = new URLSearchParams();
    const other_param = "Foo";
    search_params.append(other_param, "Bar");

    encode_filters(filters, search_params, filter_query_param_prefix_);
    encode_sorting(sort, search_params, sorting_query_param_);

    expect([...search_params.keys()].length).toBeGreaterThan(1);

    strip_encoded_filter_and_sort(search_params, filter_query_param_prefix_, sorting_query_param_);

    expect([...search_params.keys()].length).toBe(1);
    expect(search_params.has(other_param)).toBeTruthy();
  });
});

describe("Encoding transfer", () => {
  it("Should transfer all encoded params, but not others", () => {
    const sort = {
      order: "desc",
      field: "relevance",
    } as SortModel;

    const filters = [
      {
        "data": [["Accessoarer", "Skor"]],
        "field": "categories_filtered",
        "op": "in",
      },
    ] as FilterWithData[];

    const search_params = new URLSearchParams();
    const other_param = "Foo";
    search_params.append(other_param, "Bar");

    encode_filters(filters, search_params, filter_query_param_prefix_);
    encode_sorting(sort, search_params, sorting_query_param_);

    const other_other_param = "Foo2";
    const to_url = new URL("https://www.foo.com");
    to_url.searchParams.append(other_other_param, "Bar2");

    transfer_encoded_sort_and_filter({
      to_url_: to_url,
      set_clearing_flag_: false,
      from_search_params_: search_params,
      sorting_query_param_,
      filter_query_param_prefix_,
    });

    const decoded_sort = decode_sorting(to_url.searchParams, sorting_query_param_);
    const decoded_filters = decode_filters(to_url.searchParams, filter_query_param_prefix_);

    expect(isEqual(sort, decoded_sort)).toBeTruthy();
    expect(isEqual(filters, decoded_filters)).toBeTruthy();

    expect(to_url.searchParams.has(other_param)).toBeFalsy();
    expect(to_url.searchParams.has(other_other_param)).toBeTruthy();
  });
});
