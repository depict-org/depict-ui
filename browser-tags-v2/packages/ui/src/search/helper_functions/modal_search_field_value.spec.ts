import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createRoot, createSignal, Signal } from "solid-js";
import { modal_search_field_value } from "./modal_search_field_value";

describe("modal_search_field_value", () => {
  let page_value: Signal<string>;
  let pending: { resolve_: (navigated: boolean) => void; before_navigate_?: VoidFunction }[];
  let props_submit_query_: jest.Mock<(new_query?: string, before_navigate_?: VoidFunction) => Promise<boolean>>;
  let set_focus_target_after_close_: jest.Mock<(get_target: (() => HTMLElement | undefined) | undefined) => void>;
  const get_search_page_input_element_ = () => undefined;
  let dispose: VoidFunction;

  beforeEach(() => {
    page_value = createSignal("pepe");
    pending = [];
    props_submit_query_ = jest.fn(
      (_new_query?: string, before_navigate_?: VoidFunction) =>
        new Promise<boolean>(resolve_ => pending.push({ resolve_, before_navigate_ }))
    );
    set_focus_target_after_close_ = jest.fn();
  });

  const setup = (dont_sync: boolean) =>
    createRoot(d => {
      dispose = d;
      return modal_search_field_value({
        props_search_field_value_: page_value,
        props_submit_query_,
        dont_sync_search_field_value_except_on_submit_: dont_sync,
        set_focus_target_after_close_,
        get_search_page_input_element_,
      });
    });

  it("de-coupled modal starts empty, leaves the page value alone while typing and submits its own text", async () => {
    const { search_field_value_, submit_query_ } = setup(true);
    expect(search_field_value_[0]()).toBe("");
    search_field_value_[1]("kavaj");
    expect(page_value[0]()).toBe("pepe");
    const submitted = submit_query_();
    expect(props_submit_query_.mock.calls[0][0]).toBe("kavaj");
    expect(page_value[0]()).toBe("pepe");
    expect(set_focus_target_after_close_).not.toHaveBeenCalled();
    pending[0].before_navigate_!();
    expect(set_focus_target_after_close_).toHaveBeenCalledWith(get_search_page_input_element_);
    pending[0].resolve_(true);
    await expect(submitted).resolves.toBe(true);
    dispose();
  });

  it("de-coupled modal forwards text typed while its submit is in flight, and stops once it settled", async () => {
    const { search_field_value_, submit_query_ } = setup(true);
    search_field_value_[1]("kavaj");
    const submitted = submit_query_();
    search_field_value_[1]("kavaje");
    expect(page_value[0]()).toBe("kavaje");
    pending[0].resolve_(true);
    await submitted;
    search_field_value_[1]("kavajer");
    expect(page_value[0]()).toBe("kavaje");
    dispose();
  });

  it("keeps forwarding while a second submit is still in flight after the first settled", async () => {
    const { search_field_value_, submit_query_ } = setup(true);
    search_field_value_[1]("kavaj");
    const first = submit_query_();
    search_field_value_[1]("kavaje");
    const second = submit_query_();
    pending[0].resolve_(false);
    await first;
    search_field_value_[1]("kavajer");
    expect(page_value[0]()).toBe("kavajer");
    pending[1].resolve_(true);
    await second;
    dispose();
  });

  it("synced modal is the page value and passes an explicit query through", async () => {
    const { search_field_value_, submit_query_ } = setup(false);
    expect(search_field_value_).toBe(page_value);
    const submitted = submit_query_("skjorta");
    expect(props_submit_query_.mock.calls[0][0]).toBe("skjorta");
    pending[0].resolve_(true);
    await submitted;
    dispose();
  });
});
