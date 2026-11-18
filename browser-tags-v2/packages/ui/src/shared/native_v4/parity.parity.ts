/**
 * Whole-card diff of the native adapter against v3 (plan 4eez §5.2): for requests recorded by
 * scripts/native_v4_parity/record.mjs, maps each native answer the way NativeDepictAPI does and compares it with
 * the store's v3 answer to the same request. Ids are masked; every other difference is listed.
 *
 * Not part of unit-test-ci (the suffix isn't a test suffix). Run it with
 *   NATIVE_V4_PARITY_DIR=<recorded dir> yarn jest --config packages/ui/jest.config.json --rootDir packages/ui \
 *     --testMatch '**\/*.parity.ts'
 * It writes <recorded dir>/REPORT.md and fails on any difference that isn't in KNOWN (with its reason).
 */
import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { ancestors_from_tree, native_browse_to_v3, native_listing_to_v3, native_suggest_to_v3 } from "./responses";

const dir = process.env.NATIVE_V4_PARITY_DIR;

const MASKED = new Set([
  "search_result_id",
  "product_listing_result_id",
  "recommendation_id",
  "search_request_id",
  "product_listing_request_id",
  "suggestions_request_id",
  "suggestions_result_id",
  "cursor",
]);
/**
 * Differences the adapter is known to have, by field pattern, and why. A difference not listed here fails the run.
 * `visible`: what a merchant transformer or the UI can see of it.
 */
const KNOWN: Record<string, { why: string; visible: string }> = {
  "changed .is_fallback": {
    why: "V4 has no is_fallback (gap 7): null, which the UI reads as not a fallback, as v3's false",
    visible: "no: the UI only shows the notice for true; a true fallback would go unnoticed",
  },
  "missing .served_by_engine": { why: "not read by depict-ui", visible: "no" },
  "missing .served_by_engine_fallback": { why: "not read by depict-ui", visible: "no" },
  "missing .relaxed_filters": { why: "not read by depict-ui", visible: "no" },
  "changed .displays[].variant_displays[].image_urls[]": {
    why: "V4 gap: native listing browse doesn't apply the listing's image choices (default/hover image), which the v3 facade does",
    visible: "yes: another main/hover image on those cards",
  },
  "changed header.ancestors[].image_urls.length": {
    why: "V4 gap: ListingRef (breadcrumbs, quick links) has no images",
    visible: "only a categories transformer reading them; depict-ui's breadcrumbs and quick links don't",
  },
  "changed header.siblings[].image_urls.length": {
    why: "V4 gap: ListingRef (breadcrumbs, quick links) has no images",
    visible: "only a categories transformer reading them; depict-ui's breadcrumbs and quick links don't",
  },
  "changed header.children[].image_urls.length": {
    why: "V4 gap: ListingRef (breadcrumbs, quick links) has no images",
    visible: "only a categories transformer reading them; depict-ui's breadcrumbs and quick links don't",
  },
  "changed header.siblings.length": {
    why: "V4 serves the quick links (children, else siblings), not both lists; depict-ui uses children when there are any, and drops siblings that aren't shown",
    visible: "no",
  },
  "changed header.show_in_quicklinks": {
    why: "not served for the listing itself (true); depict-ui doesn't read it for the current listing",
    visible: "only a categories transformer reading it on a quick link's ancestors",
  },
  "changed .suggestions[].ancestors[].image_urls.length": {
    why: "the listing tree that names a suggestion's ancestors has no images",
    visible: "only a categories transformer reading ancestor images; the UI doesn't",
  },
};

type Diff = { where: string; kind: "missing" | "extra" | "changed"; v3?: unknown; native?: unknown };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function compare(v3: unknown, native: unknown, where: string, diffs: Diff[]) {
  if (same(v3, native)) return;
  if (Array.isArray(v3) && Array.isArray(native)) {
    if (v3.length !== native.length) {
      diffs.push({ where: `${where}.length`, kind: "changed", v3: v3.length, native: native.length });
    }
    for (let i = 0; i < Math.min(v3.length, native.length); i++) compare(v3[i], native[i], `${where}[${i}]`, diffs);
    return;
  }
  if (v3 && native && typeof v3 === "object" && typeof native === "object") {
    const a = v3 as Record<string, unknown>;
    const b = native as Record<string, unknown>;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const at = `${where}.${key}`;
      if (MASKED.has(key)) {
        if ((a[key] === undefined) !== (b[key] === undefined)) {
          diffs.push({ where: at, kind: a[key] === undefined ? "extra" : "missing" });
        }
        continue;
      }
      if (!(key in b)) diffs.push({ where: at, kind: "missing", v3: a[key] });
      else if (!(key in a)) diffs.push({ where: at, kind: "extra", native: b[key] });
      else compare(a[key], b[key], at, diffs);
    }
    return;
  }
  diffs.push({ where, kind: "changed", v3, native });
}

/** `displays[3].variant_displays[1].brand` → `displays[].variant_displays[].brand`, to count a difference once. */
const pattern = (where: string) => where.replace(/\[\d+\]/g, "[]");

type CaseResult = { name: string; kind: string; diffs: Diff[]; displays: number; ok: boolean };

function run_case(file: string): CaseResult {
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  const { case: c } = record;
  const diffs: Diff[] = [];
  let displays = 0;
  if (record.v3.status !== 200 || record.v4.status !== 200) {
    diffs.push({ where: "status", kind: "changed", v3: record.v3.status, native: record.v4.status });
  } else if (c.kind === "search" || c.kind === "listing") {
    const native = native_browse_to_v3(record.v4.body, c.kind, 0);
    displays = record.v3.body.displays.length;
    compare(record.v3.body, native, "", diffs);
    if (c.kind === "listing") {
      compare(record.v3_header.body, native_listing_to_v3(record.v4_header.body.listing), "header", diffs);
    }
  } else {
    const tree = record.v4_tree?.body?.listings;
    compare(record.v3.body, native_suggest_to_v3(record.v4.body, tree && ancestors_from_tree(tree)), "", diffs);
  }
  const unexplained = diffs.filter(diff => !KNOWN[`${diff.kind} ${pattern(diff.where)}`]);
  return { name: c.name, kind: c.kind, diffs, displays, ok: unexplained.length === 0 };
}

function report(results: CaseResult[]) {
  const lines = [
    "# Native V4 adapter vs v3: whole-card diff",
    "",
    "Ids (result ids, request ids, cursors) are masked.",
    "",
  ];
  lines.push("| Case | Displays | Differences (by field pattern) | Unexplained |", "|---|---|---|---|");
  const all = new Map<string, { kind: string; cases: Set<string>; count: number; example: Diff }>();
  for (const result of results) {
    const patterns = new Map<string, number>();
    for (const diff of result.diffs) {
      const key = `${diff.kind} ${pattern(diff.where)}`;
      patterns.set(key, (patterns.get(key) ?? 0) + 1);
      const entry = all.get(key) ?? { kind: diff.kind, cases: new Set<string>(), count: 0, example: diff };
      entry.cases.add(result.name);
      entry.count++;
      all.set(key, entry);
    }
    lines.push(
      `| ${result.name} | ${result.displays} | ${
        [...patterns].map(([key, n]) => `${key} ×${n}`).join("<br>") || "none"
      } | ${result.ok ? "no" : "**yes**"} |`
    );
  }
  lines.push(
    "",
    "## Every difference",
    "",
    "| Difference | Occurrences | Cases | Who can see it | Why | Example (v3 → native) |",
    "|---|---|---|---|---|---|"
  );
  for (const [key, entry] of [...all].sort()) {
    const known = KNOWN[key];
    const example = `${JSON.stringify(entry.example.v3)?.slice(0, 60)} → ${JSON.stringify(entry.example.native)?.slice(
      0,
      60
    )}`;
    lines.push(
      `| \`${key}\` | ${entry.count} | ${entry.cases.size} | ${known?.visible ?? "?"} | ${
        known?.why ?? "**unexplained**"
      } | ${example.replace(/\|/g, "\\|")} |`
    );
  }
  return lines.join("\n") + "\n";
}

(dir ? describe : describe.skip)("native V4 adapter parity", () => {
  it("maps every recorded native answer to the store's v3 answer", () => {
    const files = fs
      .readdirSync(dir!)
      .filter(file => file.endsWith(".json"))
      .sort()
      .map(file => path.join(dir!, file));
    const results = files.map(run_case);
    fs.writeFileSync(path.join(dir!, "REPORT.md"), report(results));
    expect(results.filter(result => !result.ok).map(result => result.name)).toEqual([]);
  });
});
