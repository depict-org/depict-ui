/** @jsxImportSource solid-js */
import { createMemo, JSX as solid_JSX, Show } from "solid-js";
import { catchify, make_random_classname } from "@depict-ai/utilishared";

interface Props {
  value_: string | number | [number, number] | [number, string] | [string, number] | [string, string];
  count_?: number;
  label_?: solid_JSX.Element;
  checked_: boolean;
  input_ref_?: (arg0: HTMLInputElement) => unknown;
  custom_indicator_ref?: (element: HTMLSpanElement) => unknown;
  is_count_zero_?: boolean;
}

/**
 * Renders a single checkbox with a label and a count
 */
export const Checkbox = (props: Props) => {
  /* don't destructure props, it could have reactive getters */
  // It seems like there's no diffing without memos here (since we often just have computations in the getters above that update to the same result often because their dependencies change with unrelated changes often), so put memos here to avoid unneeded DOM changes
  const count = createMemo(() => props.count_);
  const label = createMemo(() => props.label_);
  const checked = createMemo(() => props.checked_);
  const value = createMemo(() => props.value_ as string);
  const is_count_zero = createMemo(() => props.is_count_zero_ || count() === 0);

  const id = make_random_classname();
  return (
    /* We can't use actual margin because ExpandingContainer gets messed up */
    <label class="input-row" for={id} classList={{ "count-0": is_count_zero() }}>
      <div class="left">
        <input
          type="checkbox"
          name={value()}
          id={id}
          checked={checked()}
          disabled={!checked() && is_count_zero()}
          ref={input_el => {
            // For the checkboxes we know that they changed by putting them into a form and listening on the form changing.
            // A bug here was that some checkboxes didn't match the state of their checked() solid accessor.
            // The reason for that being that we re-use the checkboxes. That means if one box was unchecked by the user and then removed, the "checked" value of "another" checkbox (that now had position 0) had changed to 0 (because the user unchecked the box with position 0) while solid js still believed that it was checked because it's checked signal hadn't changed.
            // I've worked around this by restoring the state of the checkbox to what it is in solid js a bit after it was changed
            // Why it can't be done instantaneously I don't know.
            input_el.addEventListener(
              "change",
              catchify(() =>
                requestAnimationFrame(
                  catchify(() => {
                    if (input_el.checked !== checked()) {
                      input_el.checked = checked();
                    }
                  })
                )
              )
            );
            props.input_ref_?.(input_el);
          }}
        />
        <span class="custom-indicator" ref={el => props.custom_indicator_ref?.(el)}></span>
        <span class="text line-clamp">{label() || value()}</span>
      </div>
      <Show when={count() != undefined}>
        <span class="count">{count()}</span>
      </Show>
    </label>
  );
};
