import { describe, expect, it } from "@jest/globals";
import { isContentBlockShownOnDevice } from "./contentBlockVisibility";

describe("isContentBlockShownOnDevice", () => {
  it("shows a desktop card on desktop only and a mobile card on phones only", () => {
    expect(isContentBlockShownOnDevice("desktop", false)).toBe(true);
    expect(isContentBlockShownOnDevice("desktop", true)).toBe(false);
    expect(isContentBlockShownOnDevice("mobile", true)).toBe(true);
    expect(isContentBlockShownOnDevice("mobile", false)).toBe(false);
  });

  it("shows a card with no or an unknown visibility on every device", () => {
    for (const visibility of [undefined, null, "", "tablet", "Desktop"]) {
      expect(isContentBlockShownOnDevice(visibility, false)).toBe(true);
      expect(isContentBlockShownOnDevice(visibility, true)).toBe(true);
    }
  });
});
