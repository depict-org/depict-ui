import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createRoot, createSignal, Signal } from "solid-js";
import { render } from "solid-js/web";

jest.mock("@depict-ai/utilishared", () => ({
  catchify: (fn: any) => fn,
  observer: { wait_for_element: jest.fn() },
  instant_exec_on_suspect_history_change: new Set(),
}));

import { instant_exec_on_suspect_history_change } from "@depict-ai/utilishared";
import { SearchField } from "../components/SearchField";
import { make_search_field_value, SearchFieldValue } from "./search_field_value";
import { submit_query_handler } from "./submit_query";
import type { PseudoRouter } from "../../shared/helper_functions/pseudo_router";
import type { solid_search_i18n } from "../../locales/i18n_types";

const i18n_ = {
  back_: () => "Back",
  clear_filters_query_sorting_after_submit_: () => "Clear",
  search_field_field_aria_label_: () => "Search",
  placeholder_text_: () => "Search",
  search_submit_button_aria_label_: () => "Submit",
} as unknown as solid_search_i18n;

const fire_popstate = () =>
  (instant_exec_on_suspect_history_change as Set<(what_happened?: string) => void>).forEach(handler =>
    handler("popstate")
  );

describe("submitting a query while a results page field shows another query", () => {
  let persisted: Signal<string>;
  let search_query: Signal<string>;
  let field_value: SearchFieldValue;
  let dispose: VoidFunction;
  let input: HTMLInputElement;
  let writes: string[];
  let land_navigation: () => void;
  let router_: PseudoRouter;

  beforeEach(() => {
    document.body.innerHTML = "";
    window.scrollTo = jest.fn() as any;
    writes = [];
    persisted = createSignal("pepe");
    search_query = createSignal("pepe");
    const container = document.createElement("div");
    document.body.append(container);
    dispose = createRoot(dispose => {
      field_value = make_search_field_value(persisted, search_query[0]);
      render(
        () =>
          SearchField({
            search_field_value_: field_value.value_,
            submit_query_: () => {},
            clear_filters_: () => {},
            i18n_,
            BackIcon_: () => document.createElement("span"),
          }),
        container
      );
      return dispose;
    });
    input = container.querySelector("input")!;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
    Object.defineProperty(input, "value", {
      configurable: true,
      get() {
        return descriptor.get!.call(this);
      },
      set(value: string) {
        writes.push(value);
        descriptor.set!.call(this, value);
      },
    });
    router_ = {
      navigate_: { go_to_: jest.fn(() => new Promise<void>(resolve => (land_navigation = resolve))) },
    } as unknown as PseudoRouter;
  });

  const submit = (get_new_query: () => string, after_submit_?: VoidFunction) =>
    submit_query_handler({
      search_param_name_: "query",
      search_field_value_: field_value,
      get_search_query_: search_query[0],
      router_,
      get_new_query,
      after_submit_,
    });

  it("writes the submitted query to the field once and never writes the old query back while the router is pending", async () => {
    expect(input.value).toBe("pepe");
    const submitted = submit(() => "kavaj");
    expect(writes).toEqual(["kavaj"]);
    expect(persisted[0]()).toBe("pepe");
    await Promise.resolve();
    expect(writes).toEqual(["kavaj"]);
    land_navigation();
    await expect(submitted).resolves.toBe(true);
    expect(writes).toEqual(["kavaj"]);
    expect(input.value).toBe("kavaj");
    expect(persisted[0]()).toBe("kavaj");
    dispose();
  });

  it("keeps text typed during the pending navigation and persists it once the router lands", async () => {
    const submitted = submit(() => "kavaj");
    input.value = "kavaje";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(field_value.value_[0]()).toBe("kavaje");
    expect(persisted[0]()).toBe("pepe");
    land_navigation();
    await submitted;
    expect(input.value).toBe("kavaje");
    expect(persisted[0]()).toBe("kavaje");
    expect(writes).not.toContain("pepe");
    dispose();
  });

  it("lands as soon as the URL carries the submitted query, before the router promise settles", async () => {
    const after_submit_ = jest.fn();
    const submitted = submit(() => "kavaj", after_submit_);
    search_query[1]("kavaj");
    await Promise.resolve();
    expect(persisted[0]()).toBe("kavaj");
    expect(input.value).toBe("kavaj");
    expect(after_submit_).not.toHaveBeenCalled();
    land_navigation();
    await expect(submitted).resolves.toBe(true);
    expect(after_submit_).toHaveBeenCalledTimes(1);
    expect(writes).toEqual(["kavaj"]);
    dispose();
  });

  it("aborts on popstate so the restored entry's value shows and the submitted query is not persisted into it", async () => {
    const after_submit_ = jest.fn();
    const submitted = submit(() => "kavaj", after_submit_);
    persisted[1]("skor");
    fire_popstate();
    expect(input.value).toBe("skor");
    land_navigation();
    await expect(submitted).resolves.toBe(false);
    expect(persisted[0]()).toBe("skor");
    expect(input.value).toBe("skor");
    expect(after_submit_).not.toHaveBeenCalled();
    dispose();
  });

  it("does not land on a back navigation to an entry whose query equals the submitted one", async () => {
    const after_submit_ = jest.fn();
    const submitted = submit(() => "kavaj", after_submit_);
    search_query[1]("kavaj");
    persisted[1]("kavaj");
    fire_popstate();
    await Promise.resolve();
    land_navigation();
    await expect(submitted).resolves.toBe(false);
    expect(after_submit_).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
    dispose();
  });

  it("re-submitting the current query while another submit is pending leaves that submit alone", async () => {
    history.replaceState(null, "", "?query=pepe");
    const submitted = submit(() => "kavaj");
    const on_submit_with_unchanged_value_ = jest.fn();
    await submit_query_handler({
      search_param_name_: "query",
      search_field_value_: field_value,
      get_search_query_: search_query[0],
      router_,
      get_new_query: () => "pepe",
      on_submit_with_unchanged_value_,
    });
    expect(on_submit_with_unchanged_value_).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("kavaj");
    land_navigation();
    await expect(submitted).resolves.toBe(true);
    expect(persisted[0]()).toBe("kavaj");
    history.replaceState(null, "", "/");
    dispose();
  });

  it("arms the focus target only when it is about to navigate", async () => {
    const before_navigate_ = jest.fn();
    history.replaceState(null, "", "?query=pepe");
    await submit_query_handler({
      search_param_name_: "query",
      search_field_value_: field_value,
      get_search_query_: search_query[0],
      router_,
      get_new_query: () => "pepe",
      before_navigate_,
    });
    expect(before_navigate_).not.toHaveBeenCalled();
    const submitted = submit_query_handler({
      search_param_name_: "query",
      search_field_value_: field_value,
      get_search_query_: search_query[0],
      router_,
      get_new_query: () => "kavaj",
      before_navigate_,
    });
    expect(before_navigate_).toHaveBeenCalledTimes(1);
    land_navigation();
    await submitted;
    history.replaceState(null, "", "/");
    dispose();
  });

  it("only the last of overlapping submits lands", async () => {
    const first = submit(() => "kavaj");
    const land_first = land_navigation;
    const second = submit(() => "skjorta");
    expect(input.value).toBe("skjorta");
    land_first();
    await expect(first).resolves.toBe(false);
    expect(persisted[0]()).toBe("pepe");
    land_navigation();
    await expect(second).resolves.toBe(true);
    expect(persisted[0]()).toBe("skjorta");
    dispose();
  });

  it("closes without navigating when the query is unchanged and settles the field to it", async () => {
    history.replaceState(null, "", "?query=pepe");
    persisted[1]("kavaj");
    const on_submit_with_unchanged_value_ = jest.fn();
    const result = await submit_query_handler({
      search_param_name_: "query",
      search_field_value_: field_value,
      get_search_query_: search_query[0],
      router_,
      get_new_query: () => "pepe",
      on_submit_with_unchanged_value_,
    });
    expect(result).toBe(false);
    expect(on_submit_with_unchanged_value_).toHaveBeenCalledTimes(1);
    expect(router_.navigate_.go_to_).not.toHaveBeenCalled();
    expect(input.value).toBe("pepe");
    history.replaceState(null, "", "/");
    dispose();
  });
});
