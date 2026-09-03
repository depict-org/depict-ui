import { describe, expect, jest, test } from "@jest/globals";
import { render } from "solid-js/web";

jest.mock("@depict-ai/utilishared/latest", () => ({
  catchify: (fn: any) => fn,
  observer: { wait_for_element: jest.fn() },
  report: jest.fn(),
}));

jest.mock("@depict-ai/utilishared", () => ({
  dlog: jest.fn(),
}));

jest.mock("../../shared/components/ModernResponsiveContainedImage", () => ({
  ModernResponsiveImage: () => null,
}));

jest.mock("../../shared/components/shopify/makeSizeAccessors", () => ({
  makeSizeAccessors: () => [() => 0, () => 0],
}));

jest.mock("../../shared/components/Placeholders/ImagePlaceholder", () => ({
  ImagePlaceholder: () => null,
}));

jest.mock("../helpers/loadHlsPolyfill", () => ({
  loadHlsPolyfill: jest.fn(),
}));

jest.mock("../../shared/helper_functions/useVisibilityState", () => ({
  useVisibilityState: () => () => true,
}));

import { ContentElement } from "./ContentElement";
import { makeComponentCacheKey } from "../helpers/useBackendContentBlocks";

const renderContentElement = (extraProps: { text_?: string | null; textPosition_?: any; cta_?: string | null }) => {
  const container = document.createElement("div");
  const dispose = render(
    () =>
      ContentElement({
        link_: "https://example.com/collection",
        type_: "image",
        mediaUrl_: "https://example.com/image.jpg",
        router_: { navigate_: { go_to_: jest.fn() } } as any,
        setAspectRatioWas_: () => {},
        aspectRatioWhenAloneInRow_: () => undefined,
        ...extraProps,
      }),
    container
  );
  return { container, dispose };
};

describe("ContentElement CTA line", () => {
  test("no-cta markup is unchanged (text span stays a direct, un-nested child of the wrapper)", () => {
    const { container, dispose } = renderContentElement({ text_: "Shop the look", textPosition_: "top-left" });
    const wrapper = container.querySelector(".d-standard-content-wrapper")!;
    const text = wrapper.querySelector(".d-standard-content-text")!;
    expect(text.parentElement).toBe(wrapper);
    expect(text.outerHTML).toBe('<span class="d-standard-content-text" data-position="top-left">Shop the look</span>');
    expect(wrapper.querySelector(".d-standard-content-text-group")).toBeNull();
    expect(wrapper.querySelector(".d-standard-content-cta")).toBeNull();
    dispose();
  });

  test("no-cta markup is byte-identical for cta null vs prop absent", () => {
    const a = renderContentElement({ text_: "Shop the look" });
    const b = renderContentElement({ text_: "Shop the look", cta_: null });
    expect(b.container.innerHTML).toBe(a.container.innerHTML);
    expect(a.container.querySelector(".d-standard-content-text")!.getAttribute("data-position")).toBe("bottom-center");
    a.dispose();
    b.dispose();
  });

  test("cta renders under the title, in the same position group, verbatim", () => {
    const { container, dispose } = renderContentElement({
      text_: "Summer edit",
      textPosition_: "bottom-right",
      cta_: "Shop Now",
    });
    const wrapper = container.querySelector(".d-standard-content-wrapper")!;
    const group = wrapper.querySelector(".d-standard-content-text-group")!;
    expect(group).not.toBeNull();
    expect(group.parentElement).toBe(wrapper);
    expect(group.getAttribute("data-position")).toBe("bottom-right");
    const [text, cta] = group.children;
    expect(text.outerHTML).toBe(
      '<span class="d-standard-content-text" data-position="bottom-right">Summer edit</span>'
    );
    expect(cta.outerHTML).toBe('<span class="d-standard-content-cta" data-position="bottom-right">Shop Now</span>');
    // No casing transform: the string is rendered verbatim
    expect(cta.textContent).toBe("Shop Now");
    dispose();
  });

  test("cta without text renders nothing (text gates the overlay, like before)", () => {
    const { container, dispose } = renderContentElement({ cta_: "Shop Now" });
    expect(container.querySelector(".d-standard-content-cta")).toBeNull();
    expect(container.querySelector(".d-standard-content-text")).toBeNull();
    dispose();
  });
});

describe("component cache key", () => {
  const base = {
    link: "https://example.com/collection",
    type: "image" as const,
    url: "https://example.com/image.jpg",
    text: "Summer edit",
    text_position: "bottom-center" as const,
  };

  test("a cta-only edit changes the key (forces re-render)", () => {
    expect(makeComponentCacheKey({ ...base, cta: "Shop Now" })).not.toBe(makeComponentCacheKey({ ...base }));
    expect(makeComponentCacheKey({ ...base, cta: "Shop Now" })).not.toBe(
      makeComponentCacheKey({ ...base, cta: "Shop now" })
    );
  });

  test("identical content yields identical keys, cta absent and null are equivalent", () => {
    expect(makeComponentCacheKey({ ...base, cta: "Shop Now" })).toBe(
      makeComponentCacheKey({ ...base, cta: "Shop Now" })
    );
    expect(makeComponentCacheKey({ ...base })).toBe(makeComponentCacheKey({ ...base, cta: null }));
  });
});
