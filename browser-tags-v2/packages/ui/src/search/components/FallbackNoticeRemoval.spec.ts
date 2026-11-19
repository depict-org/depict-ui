import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { resolve } from "path";

// Keep the removal complete across all storefront search surfaces.
describe("search surfaces do not show a fallback notice", () => {
  it.each([
    "../SearchPage.tsx",
    "./modal/classic/ClassicSearchModal.tsx",
    "./modal/v2/SearchModalV2.tsx",
  ])("does not mount the fallback notice in %s", relativePath => {
    const source = readFileSync(resolve(__dirname, relativePath), "utf8");
    expect(source).not.toMatch(/NoExactMatches|is_similar_products_fallback/);
  });
});
