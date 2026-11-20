import type { ContentHit, Facet, Sort } from "./v4_types";

/**
 * Filters, facets and sorts between depict-ui's v3 shapes and the native V4 API.
 *
 * This is a client-side port of realtime's v3 facade (`v4/worker/src/facade/v3Browse.ts`: `v3FilterBy`, `toV3Filters`,
 * `toV3Sorts`, `toV3ContentLinks`), which owns the same translation on the server for v3 requests. Keep the two in
 * step: a difference shows up as a filter that works on v3 and not on native, or the other way round.
 *
 * The facade resolves a v3 filter field against the merchant's search config (titles, localized titles). The browser
 * has no config, so it resolves against the facets V4 served instead (see {@link FacetIndex}).
 */

/** A v3 filter as depict-ui sends it: `field` is often the lowercased group title (modify_fiters_to_group_title_as_field). */
export type V3RequestFilter = {
  field: string;
  op: "eq" | "neq" | "in" | "nin" | "leq" | "geq" | "inrange";
  data?: unknown;
  [key: string]: unknown;
};

type FilterValue = string | number | boolean;

/** Thrown for a filter V4 can't express; the caller answers with the fallback response, as a v3 400 would. */
export class NativeFilterError extends Error {}

/** v3's names for V4's built-in fields, both ways. */
const V3_FIELD: Record<string, string> = { price: "sale_price" };
const V4_FIELD: Record<string, string> = { sale_price: "price" };
const V3_SORT: Record<string, string> = {
  relevance: "_relevance",
  price: "sale_price",
  newest: "product_timestamp",
};
const V4_SORT: Record<string, string> = Object.fromEntries(Object.entries(V3_SORT).map(([v4, v3]) => [v3, v4]));

/** V4's public filter field syntax (`FilterField` in the contract). */
const PUBLIC_FIELD = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
/**
 * Fields that are never a lowercased group title: v3's toggles carry no group title, and `sale_price` is v3's own
 * name for V4's price. A reserved V4 field (`price`, `brand`, `category`) is not among them: iciw's category tree is
 * titled "Category", so `category` from a link may name `product_scollection_category_hierarchy`.
 */
const NEVER_A_TITLE = new Set(["in_stock", "on_sale", "sale_price"]);
/** fi's enriched colour fields: their values are names, never a `<name>;#<hex>` composite. */
const FI_COLOUR_FIELDS = new Set(["colors", "color_details"]);
/** The colour template's field, which indexes the composite itself. */
const V3_TEMPLATE_COLOUR = "color_with_hex_list";
/** Legacy's colour pill composite suffix (`Green;#9ea386`). */
const HEX_SUFFIX = /;#[0-9a-fA-F]{3,8}\s*$/;
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** realtime's separator between the levels of a hierarchical facet value (`Shop # Woman`). */
const HIERARCHY_SEPARATOR = " # ";
/** The features realtime's category tree is built on. */
const CATEGORY_TREE_FIELDS: ReadonlySet<string> = new Set([
  "product_category_hierarchy",
  "product_scollection_category_hierarchy",
]);
/** The fields of V4's toggle facets (the `on_sale` and `in_stock` templates). */
const V3_TOGGLES = new Set(["on_sale", "in_stock"]);

type FieldInfo = { field_: string; checkbox_: boolean; colour_: boolean };

/**
 * What the browser knows about a merchant's filter fields: every facet V4 has served it, by public field name and by
 * lowercased title. Titles are per locale, so keep one index per merchant, market and locale.
 */
export class FacetIndex {
  #by_key = new Map<string, FieldInfo>();

  /** Adds the facets of one browse response. */
  learn_(facets: readonly Facet[] | undefined) {
    for (const facet of facets ?? []) {
      const info: FieldInfo = {
        field_: facet.field,
        checkbox_: facet.type === "checkbox" && !is_toggle(facet),
        colour_: FI_COLOUR_FIELDS.has(facet.field) || (facet.type === "swatch" && facet.field !== V3_TEMPLATE_COLOUR),
      };
      this.#by_key.set(facet.field, info);
      const v3_field = V3_FIELD[facet.field];
      if (v3_field) this.#by_key.set(v3_field, info);
      if (facet.title) this.#by_key.set(facet.title.toLowerCase(), info);
    }
  }

  /** The field a v3 filter field names, when a served facet has it as its field or its title. */
  get_(field: string): FieldInfo | undefined {
    const bare = field.replace(/#$/, "");
    const direct = this.#by_key.get(bare);
    if (direct) return direct;
    let wanted: string;
    try {
      wanted = decodeURIComponent(bare).toLowerCase();
    } catch {
      wanted = bare.toLowerCase();
    }
    return this.#by_key.get(wanted);
  }
}

/**
 * Whether `field` resolves without reading the facets: a served facet's field or title, or a field that can't be a
 * group title. Any other field may be a title, a reserved field's name included, so a link's filters read the facets
 * once before they are sent.
 */
export function is_resolvable_field(field: string, index: FacetIndex): boolean {
  return !!index.get_(field) || NEVER_A_TITLE.has(field.replace(/#$/, ""));
}

function is_empty(data: unknown): boolean {
  return data === undefined || data === null || data === "" || (Array.isArray(data) && !data.length);
}

function literal(value: unknown, field: string): string {
  const text = String(value);
  if (text.includes("`")) throw new NativeFilterError(`filters: a value of ${field} contains a backtick`);
  // A boolean-looking string is written bare, as realtime's filter writer does for every field.
  if (/^(true|True|false|False)$/.test(text)) return text.toLowerCase();
  if (field === "price" && NUMERIC.test(text)) return text;
  return typeof value === "string" ? `\`${text}\`` : text;
}

function lax_number(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/**
 * v3 filters as one Typesense `filter_by` over V4's public field names, ANDed (the facade's `v3FilterBy`). A field
 * the index doesn't know is sent as it came (after the `sale_price` → `price` alias); V4 then answers
 * `unknown_filter_field` for one it doesn't take either.
 */
export function v3_filters_to_filter_by(filters: readonly V3RequestFilter[], index: FacetIndex): string | undefined {
  const clauses = filters.flatMap(filter => {
    if (is_empty(filter.data)) return [];
    const info = index.get_(filter.field);
    const bare = filter.field.replace(/#$/, "");
    const field = info?.field_ ?? V4_FIELD[bare] ?? bare;
    if (!PUBLIC_FIELD.test(field)) throw new NativeFilterError(`Invalid filter field \`${filter.field}\``);
    const colour = FI_COLOUR_FIELDS.has(field) || !!info?.colour_;
    const data = filter.data as FilterValue | (FilterValue | FilterValue[])[];
    const values = (Array.isArray(data) ? data : [data]).map(value =>
      !Array.isArray(value)
        ? colour && typeof value === "string"
          ? value.replace(HEX_SUFFIX, "").trim() || value
          : value
        : field === "category"
        ? value[value.length - 1]
        : value.map(String).join(HIERARCHY_SEPARATOR)
    );
    const list = () => `[${values.map(value => literal(value, field)).join(",")}]`;
    // A configured checkbox keeps in/nin; every other op on it becomes in.
    if (filter.op !== "in" && filter.op !== "nin" && info?.checkbox_) {
      return [`${field}:=${list()}`];
    }
    const one = () => {
      if (values.length !== 1) throw new NativeFilterError(`filters: ${filter.op} takes one value`);
      return literal(values[0], field);
    };
    // A comparison takes a number, also one sent as a string; of several numbers `geq` takes the largest.
    const bound = () => {
      const numbers = values.map(value =>
        typeof value === "number" || (typeof value === "string" && NUMERIC.test(value)) ? Number(value) : undefined
      );
      if (numbers.length === 0 || numbers.some(number => number === undefined)) return one();
      if (numbers.length > 1 && filter.op !== "geq") return one();
      return String(Math.max(...(numbers as number[])));
    };
    switch (filter.op) {
      case "eq":
        return [`${field}:=${one()}`];
      case "neq":
        return [`${field}:!=${one()}`];
      case "in":
        return [`${field}:=${list()}`];
      case "nin":
        return [`${field}:!=${list()}`];
      case "leq":
        return [`${field}:<=${bound()}`];
      case "geq":
        return [`${field}:>=${bound()}`];
      case "inrange": {
        const [min, max] = values.map(lax_number);
        if (min === undefined || max === undefined || values.length !== 2) {
          throw new NativeFilterError("filters: inrange takes [min, max]");
        }
        return [`${field}:[${min}..${max}]`];
      }
      default:
        throw new NativeFilterError(`filters: unknown op ${filter.op as string}`);
    }
  });
  return clauses.length ? clauses.join(" && ") : undefined;
}

/** A v3 sort as V4's; the relevance default is no sort (Python discards it, and so does the facade). */
export function v3_sort_to_native(
  sort: { field: string; order: "asc" | "desc" } | undefined
): { field: string; order: "asc" | "desc" } | undefined {
  if (!sort || sort.field === "_relevance") return undefined;
  return { field: V4_SORT[sort.field] ?? sort.field, order: sort.order };
}

/** realtime's SortModel list: one entry per field and order, the title as its only name. */
export function native_sorts_to_v3(sorts: readonly Sort[]) {
  return sorts.map(sort => ({
    field: V3_SORT[sort.field] ?? sort.field,
    order: sort.order,
    meta: { title: sort.title, values: [sort.order], names: [sort.title] },
  }));
}

const V3_VALUES_TYPE: Record<string, string> = {
  checkbox: "checkbox",
  radio: "radio",
  swatch: "checkbox-color",
  hierarchy: "checkbox-hierarchical",
  grid: "checkbox-grid",
};

/** A toggle is a template facet's one `true` value. */
function is_toggle(facet: Facet) {
  return (
    V3_TOGGLES.has(facet.field) &&
    facet.type === "checkbox" &&
    facet.values.length === 1 &&
    facet.values[0].value === "true"
  );
}

function category_path(value: string): string[] {
  return value
    .split("#")
    .map(level => level.trim())
    .filter(Boolean);
}

/**
 * realtime's SearchFilter list (the facade's `toV3Filters`): each facet with its options in `meta`. A values filter has
 * no `data` (the selection is the client's own) and a range's `data` is its bounds. Facets with no values are left out.
 */
export function native_facets_to_v3(facets: readonly Facet[], currency: string | undefined) {
  return facets
    .filter(facet => facet.type === "range" || facet.values.length > 0)
    .map(facet => {
      const field = V3_FIELD[facet.field] ?? facet.field;
      if (facet.type === "range") {
        return {
          field,
          op: "inrange" as const,
          data: [facet.min, facet.max] as [number, number],
          meta: {
            group_title: facet.title,
            type: "range" as const,
            min: facet.min,
            max: facet.max,
            ...(facet.field === "price" && currency ? { currency } : {}),
          },
          id: `${field}1`,
        };
      }
      const hierarchy = facet.type === "hierarchy";
      const path = (value: string) =>
        CATEGORY_TREE_FIELDS.has(facet.field) ? category_path(value) : value.split(HIERARCHY_SEPARATOR);
      if (is_toggle(facet)) {
        return {
          field,
          op: "eq" as const,
          meta: {
            type: "checkbox" as const,
            values: facet.values.map(value => value.value),
            counts: facet.values.map(value => value.count),
            names: facet.values.map(value => value.label),
          },
          id: `${field}1`,
        };
      }
      // Two spellings of one category path are one row in the tree.
      const seen = new Set<string>();
      const values = CATEGORY_TREE_FIELDS.has(facet.field)
        ? facet.values.filter(({ value }) => {
            const levels = path(value);
            const key = JSON.stringify(levels);
            if (levels.length === 0 || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
        : facet.values;
      return {
        field,
        op: facet.field === "discount" ? ("geq" as const) : ("in" as const),
        meta: {
          group_title: facet.title,
          type: (V3_VALUES_TYPE[facet.type] ?? "checkbox") as "checkbox",
          values: values.map(value => (hierarchy ? path(value.value) : value.value)) as string[],
          counts: values.map(value => value.count),
          names: values.map(value => (hierarchy ? path(value.value).slice(-1)[0] : value.label)),
          // The colour template sends swatches only with one to paint; a colour filter always sends them.
          ...(facet.type === "swatch" &&
          (facet.field !== V3_TEMPLATE_COLOUR || facet.values.some(value => value.swatch))
            ? { swatches: facet.values.map(value => value.swatch ?? null) }
            : {}),
        },
        id: `${field}1`,
      };
    });
}

/** V4's content hits as realtime's `ContentLink`s, in realtime's key order. */
export function native_content_to_v3(content: readonly ContentHit[]) {
  return content.map(hit => ({
    type: "content_link" as const,
    title: hit.title,
    ...(hit.description !== undefined ? { description: hit.description } : {}),
    ...(hit.image_url !== undefined ? { image_url: hit.image_url } : {}),
    page_url: hit.url,
    highlights: hit.highlights ?? [],
  }));
}
