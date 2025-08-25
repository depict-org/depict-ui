import { Node_Array } from "../rendering/recommendation-renderer/types";

export type ReactiveTemplateValueContents =
  | string
  | number
  | Node_Array[number]
  | undefined
  | (string | number | Node_Array[number])[];
type SubscribeFn = (set_template_array: (new_value: Node_Array) => void) => {
  get_state_: () => ReactiveTemplateValueContents;
  unsubscribe_: VoidFunction;
};
const connection_map = /*@__PURE__*/ new WeakMap<Node_Array, SubscribeFn>();

export function reactive_template(
  initial_value?: ReactiveTemplateValueContents
): readonly [Node_Array, () => ReactiveTemplateValueContents, (arg0: ReactiveTemplateValueContents) => void] {
  let subscribed:
    | false
    | {
        get_state_: () => ReactiveTemplateValueContents;
        unsubscribe_: VoidFunction;
      } = false;

  const subscriber_array_fns = new Set<(new_value: Node_Array) => void>();

  const template_text_node = document.createTextNode("");
  const current_els: Node_Array = [template_text_node];
  let state: ReactiveTemplateValueContents;
  const get_state = () => {
    if (subscribed) {
      return subscribed.get_state_();
    } else {
      return state;
    }
  };

  const update_state = (new_value: ReactiveTemplateValueContents) => {
    if (subscribed) {
      // break subscription  - we're supposed to get a new value
      subscribed.unsubscribe_();
      subscribed = false;
    }
    const input_as_array =
      typeof new_value === "object" && typeof new_value?.[Symbol.iterator] === "function"
        ? [...(new_value as (string | number | Node_Array[number])[])]
        : [new_value as string | number | Node_Array[number]];
    if (!input_as_array.length) {
      input_as_array.push(template_text_node.cloneNode() as Text);
    }
    const array_with_replacewithable_nodes: Node_Array = [];
    for (let i = 0; i < input_as_array.length; i++) {
      const entry = input_as_array[i];
      if (!(entry instanceof Node)) {
        array_with_replacewithable_nodes.push(document.createTextNode(entry as string));
      } else if (entry instanceof DocumentFragment) {
        array_with_replacewithable_nodes.push(...(entry.childNodes as NodeListOf<Node_Array[number]>));
      } else {
        array_with_replacewithable_nodes.push(entry);
      }
    }
    // we need to remove the overshoot-nodes first since they might contain one of the new nodes in array_with_replacewithable_nodes, in which case we would otherwise first re-insert them and then remove them
    for (let i = 1; i < current_els.length; i++) {
      current_els[i].remove();
    }
    current_els[0].replaceWith(...array_with_replacewithable_nodes);
    while (current_els.length) {
      current_els.pop();
    }
    current_els.push(...array_with_replacewithable_nodes);
    for (const set_fn of subscriber_array_fns) {
      set_fn(array_with_replacewithable_nodes);
    }
    state = new_value;

    // set subscribed and then synchronize here, if should subscribe
    const connection_fn = connection_map.get(
      new_value as Node_Array /* if we get updated to the `elements` of another reactive_template it has to be an array */
    );
    if (connection_fn) {
      // merge with reactive_template we got set to
      subscribed = connection_fn(new_state => {
        while (current_els.length) {
          current_els.pop();
        }
        current_els.push(...new_state);
      });
    }
  };

  if (initial_value != null) {
    update_state(initial_value);
  }

  connection_map.set(current_els, set_template_array => {
    subscriber_array_fns.add(set_template_array);
    set_template_array(current_els);

    return {
      get_state_: get_state,
      unsubscribe_: () => subscriber_array_fns.delete(set_template_array),
    };
  });

  return [current_els, get_state, update_state] as const;
}
