import { infinite_promise_no_skip } from "./infinite_promise_noskip";
import { err } from "./err";
import { Node_Array } from "../rendering/recommendation-renderer/types";
import { dwarn } from "../logging/dlog";
import { deparallelize } from "../utilities/async_function_only_once";

/**
 * @deprecated This is a predecessor to reactive_template which is much more limited (can only have two states) plus it's much more cumbersome to use, which is why I'm deprecating it.
 */

export function placeholder(...args: Parameters<typeof placeholder_worker>) {
  placeholder_worker(...args).catch(err);
  return args[0];
}

type accepted_element_types = Node_Array[0] | Node_Array;
type accepted_input_that_resolves_to_elements =
  | accepted_element_types
  | Promise<accepted_element_types>
  | (() => accepted_element_types)
  | (() => Promise<accepted_element_types>);

async function placeholder_worker(
  placeholder_elements: accepted_input_that_resolves_to_elements,
  final_elements: accepted_input_that_resolves_to_elements,
  switching_trigger?: infinite_promise_no_skip<boolean> | Promise<boolean>
) {
  let state = false;
  let has_sanitized_elements = false;
  const sanit_el_if_needed = async () => {
    if (!has_sanitized_elements) {
      has_sanitized_elements = true;
      placeholder_elements = await convert_to_node_array(placeholder_elements);
      final_elements = await convert_to_node_array(final_elements);
    }
  };
  if (switching_trigger instanceof infinite_promise_no_skip) {
    while (true) {
      const new_state = await switching_trigger.promise;
      if (new_state != state) {
        await sanit_el_if_needed();
        await decide_direction_and_switch(placeholder_elements, final_elements, new_state);
        state = new_state;
      }
    }
  } else if (switching_trigger instanceof Promise) {
    const new_state = await switching_trigger;
    if (state != new_state) {
      await sanit_el_if_needed();
      await decide_direction_and_switch(placeholder_elements, final_elements, new_state);
      state = new_state;
    }
  } else {
    await sanit_el_if_needed();
    placeholder_elements[0].addEventListener(
      "placeholder_switch",
      deparallelize(async (e: CustomEvent) => {
        const new_state = e.detail.state;
        if (state != new_state) {
          await sanit_el_if_needed();
          await decide_direction_and_switch(placeholder_elements, final_elements, new_state);
          state = new_state;
        }
      })
    );
  }
}

async function convert_to_node_array(elements: accepted_input_that_resolves_to_elements): Promise<Node_Array> {
  if (typeof elements == "function") {
    elements = elements();
  }
  elements = await elements;

  if (typeof elements[Symbol.iterator] != "function") {
    elements = [elements] as Node_Array;
  }
  return elements as Node_Array;
}

async function decide_direction_and_switch(
  placeholder_elements: accepted_input_that_resolves_to_elements,
  final_elements: accepted_input_that_resolves_to_elements,
  switch_to_final: boolean
) {
  if (switch_to_final) {
    switch_elements(placeholder_elements as Node_Array, final_elements as Node_Array);
  } else {
    switch_elements(final_elements as Node_Array, placeholder_elements as Node_Array);
  }
}

function switch_elements(from: Node_Array, to: Node_Array) {
  if (!from.length || !to.length) {
    dwarn("Cannot switch elements as from or to is empty", from, to);
  }
  from[0].replaceWith(...to);

  for (let i = 1; i < from.length; i++) {
    from[i].remove();
  }
}
