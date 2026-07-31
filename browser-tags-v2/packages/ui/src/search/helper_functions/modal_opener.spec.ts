import { modal_opener } from "./modal_opener";

jest.mock("@depict-ai/utilishared", () => ({
  catchify: (fn: any) => fn,
  observer: { wait_for_element: jest.fn() },
}));

const flush_tasks = () => new Promise(resolve => setTimeout(resolve, 0));

describe("modal_opener focus restore", () => {
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    trigger = document.createElement("button");
    document.body.append(trigger);
  });

  const setup = async () => {
    let inside_button!: HTMLButtonElement;
    let register_closing_animation: ((animation: () => Promise<any>) => void) | undefined;
    let modals_created = 0;
    const { open_modal_, close_modal_ } = await modal_opener(options => {
      modals_created++;
      register_closing_animation = options.register_closing_animation_;
      const wrapper = document.createElement("div");
      wrapper.className = "fake-modal";
      inside_button = document.createElement("button");
      wrapper.append(inside_button);
      return [wrapper];
    }, {});
    return {
      open_modal_,
      close_modal_,
      get_inside_button_: () => inside_button,
      get_register_closing_animation_: () => register_closing_animation!,
      get_modals_created_: () => modals_created,
    };
  };

  it("restores focus to the element focused before open", async () => {
    const { open_modal_, close_modal_, get_inside_button_ } = await setup();
    trigger.focus();
    await open_modal_();
    await flush_tasks();
    get_inside_button_().focus();
    close_modal_();
    expect(document.activeElement).toBe(trigger);
    await flush_tasks();
  });

  it("skips restore when the trigger was removed while the modal was open", async () => {
    const { open_modal_, close_modal_, get_inside_button_ } = await setup();
    trigger.focus();
    await open_modal_();
    await flush_tasks();
    get_inside_button_().focus();
    trigger.remove();
    close_modal_();
    // Nothing else may grab focus either — it should rest on body, as before this feature
    expect(document.activeElement).toBe(document.body);
    await flush_tasks();
  });

  it("does not steal focus when the user focused something outside the modal before close", async () => {
    const { open_modal_, close_modal_ } = await setup();
    const other_field = document.createElement("input");
    document.body.append(other_field);
    trigger.focus();
    await open_modal_();
    await flush_tasks();
    other_field.focus();
    close_modal_();
    expect(document.activeElement).toBe(other_field);
    await flush_tasks();
  });

  it("does not reopen the modal when the trigger opens it on focus", async () => {
    const { open_modal_, close_modal_, get_inside_button_, get_modals_created_ } = await setup();
    const open_on_focus = () => void open_modal_();
    trigger.addEventListener("focus", open_on_focus);
    trigger.focus();
    await flush_tasks();
    expect(get_modals_created_()).toBe(1);
    get_inside_button_().focus();
    close_modal_();
    expect(document.activeElement).toBe(trigger);
    await flush_tasks();
    await flush_tasks();
    expect(get_modals_created_()).toBe(1);
    expect(document.querySelector(".fake-modal")).toBeNull();
    trigger.removeEventListener("focus", open_on_focus);
  });

  it("does not steal focus from a modal reopened during the previous one's closing animation", async () => {
    const { open_modal_, close_modal_, get_inside_button_, get_register_closing_animation_, get_modals_created_ } =
      await setup();
    trigger.focus();
    await open_modal_();
    await flush_tasks();
    let finish_animation!: () => void;
    get_register_closing_animation_()(() => new Promise<void>(resolve => (finish_animation = resolve)));
    get_inside_button_().focus();
    close_modal_(); // starts the closing animation, actually_close deferred
    // Simulate the new modal's focus not taking (e.g. iOS Safari outside a user gesture): nothing focused
    get_inside_button_().blur();
    await open_modal_(); // reopen while the old modal is still animating out
    await flush_tasks();
    expect(get_modals_created_()).toBe(2);
    finish_animation();
    await flush_tasks();
    // The stale actually_close must not pull focus to the trigger while the new modal is open
    expect(document.activeElement).not.toBe(trigger);
    expect(document.querySelector(".fake-modal")).not.toBeNull();
  });
});
