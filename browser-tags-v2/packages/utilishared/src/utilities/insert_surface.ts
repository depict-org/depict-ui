import { reactive_template } from "./reactive_template";
import { on_next_navigation } from "./history";
import { InsertionVerb, Surface } from "./integration";
import { Disconnector, ElementObserverEvent, observer } from "../element-observer";
import { Display, Node_Array } from "../rendering/recommendation-renderer/types";
import { catchify, report } from "../logging/error";
import { CallbackableNode } from "../element-observer/ElementObserver";
import { dlog } from "../logging/dlog";

let context_counter = 0; // last context that was created (unless 0), to make sure we don't have two of the same
let current_context: number | null;
const failed_contexts = /*@__PURE__*/ new Set();

/**
 * Creates a context for every a function that could cause an `insert_surface` infinite loop (by restoring to old els on no recs which then again triggers an insertion) and hinders any further execution of the function of that "context" if the `insert_surface` call it contains fails
 * @param  ...args               Any arguments that will also be passed on to the wrapped function. If the wrapped function takes an ElementObserverEvent the disconnector on it will also be called if a context should be "stopped";
 * @return         A wrapped function that now executes in a context
 */
export const prevent_infinite_loop = <A extends any[], B>(cb: (...args: A) => B | void) => {
  const context = ++context_counter;
  return (...args: A) => {
    const prev_context = current_context;
    current_context = context;
    if (failed_contexts.has(context)) {
      const [first_arg] = args;
      if (first_arg instanceof ElementObserverEvent) {
        first_arg.disconnector();
      }
      return;
    }
    const retval = cb(...args);
    current_context = prev_context;
    return retval;
  };
};

/**
 * Inserts one or multiple surfaces into the DOM.
 * Will also revert (if verb is `replaceWith`) or remove the inserted elements again if placeholder rendering fails. This happens by a promise inside of the `Surface`s
 * @param surfaces            Array with surfaces to insert
 * @param verb               Verb on how to insert
 * @param target           Selector for `observer.onexists` to find element to insert VERBto, alternatively an element
 * @param remove_after_navigation Whether to remove the elements from the DOM again if a navigation away occurs, defaults to true
 * @param try_forever Whether to try to insert the same surface even after the page has navigated away, defaults to false
 * @param preserve_elements Whether to reinsert elements into it's container if they are removed, useful for sites using VDOM diffing such as react where nodes that aren't in the VDOM are removed when rerendering
 * @return                   An array of promises, corresponding to the provided surfaces, where each promise will resolve with an object containing the surface and whether it failed or succeded
 */

export function insert_surfaces<T extends Display>({
  surfaces: input_surfaces,
  verb,
  target,
  remove_after_navigation = true,
  try_forever = false,
  preserve_elements = false,
}: {
  verb: InsertionVerb;
  target: string | HTMLElement;
  remove_after_navigation?: boolean;
  try_forever?: boolean;
  surfaces: (Promise<Surface<T> | void> | Surface<T> | void)[];
  preserve_elements?: boolean;
}) {
  const surfaces = input_surfaces.map(s => {
    let resolve: (
      value:
        | {
            surface: Surface<T>;
            succeeded: boolean;
          }
        | PromiseLike<{
            surface: Surface<T>;
            succeeded: boolean;
          }>
    ) => void;
    const promise = new Promise<{ surface: Surface<T>; succeeded: boolean }>(r => (resolve = r));
    return {
      surface_: s,
      resolve_promise_: resolve!,
      promise_: promise,
    };
  });
  const { href } = location;
  let context = current_context;

  if (typeof target === "string") {
    context ??= ++context_counter; // assign a context so that we don't add `undefined` or `null` to failed_contexts
    let disconnect_reinsertion_observers: VoidFunction | undefined;
    const disconnect_observer = observer.onexists(target, ({ element, disconnector }) => {
      if (failed_contexts.has(context)) {
        disconnector(); // prevent infinite loop
        return;
      }
      disconnect_reinsertion_observers?.(); // Not sure if necessary? But if we re-insert in the same container and don't disconnect preserve_elements observers before it might lead to two observers acting on one element
      disconnect_reinsertion_observers = actual_insertion(
        element,
        verb,
        surfaces,
        try_forever,
        href,
        context,
        remove_after_navigation,
        preserve_elements
      );
    });

    if (!try_forever) {
      on_next_navigation(disconnect_observer);
    }
  } else {
    if (!context && verb !== "replaceChildren") {
      throw new Error(
        "insert_surface, provided an element, may not be called without a context." +
          (process.env.DEBUG === "true"
            ? " Please wrap the function calling it into prevent_infinite_loop(). If you have already done that, make sure that there's no `await` before the calling of insert_surface"
            : "")
      );
    }

    catchify(actual_insertion)(
      target,
      verb,
      surfaces,
      try_forever,
      href,
      context,
      remove_after_navigation,
      preserve_elements
    );
  }

  return surfaces.map(({ promise_ }) => promise_);
}

export const revertable_remove = /*@__PURE__*/ catchify(
  async (target: Element | Node_Array | string, should_stay_inserted: Promise<boolean>) => {
    const per_el_fn = (el: Element | ChildNode, disconnect_observer?: Disconnector) => {
      const comment_node = document.createComment("Old recs were here // Depict");
      dlog("Replacing", el, "with", comment_node);
      el.replaceWith(comment_node);
      should_stay_inserted.then(keep => {
        if (!keep) {
          dlog("Reverting", comment_node, "to", el);
          comment_node.replaceWith(el);
          disconnect_observer?.();
        }
      });
    };

    if (typeof target == "string") {
      const disconnect_observer = observer.onexists(target, ({ element, disconnector }) =>
        per_el_fn(element, disconnector)
      );
      on_next_navigation(disconnect_observer);
    } else {
      let did_already_fail = false;
      should_stay_inserted.then(should_stay_inserted => {
        if (!should_stay_inserted) {
          did_already_fail = true;
        }
      });
      await 0;
      if (did_already_fail) {
        dlog("Not removing", target, should_stay_inserted, "is already resolved to false");
        return;
      }
      if (Array.isArray(target)) {
        for (let i = 0; i < target.length; i++) {
          per_el_fn(target[i]);
        }
      } else {
        per_el_fn(target);
      }
    }
  }
);

function actual_insertion<T extends Display>(
  target: Element,
  verb: InsertionVerb,
  surfaces: {
    surface_: void | Surface<T> | Promise<void | Surface<T>>;
    resolve_promise_: (
      value:
        | {
            surface: Surface<T>;
            succeeded: boolean;
          }
        | PromiseLike<{
            surface: Surface<T>;
            succeeded: boolean;
          }>
    ) => void;
    promise_: Promise<{
      surface: Surface<T>;
      succeeded: boolean;
    }>;
  }[],
  try_forever: boolean,
  starting_href: string,
  context: number | null,
  remove_after_navigation: boolean,
  preserve_elements: boolean
) {
  let failed_surfaces = 0;
  let old_children: Node_Array;
  if (verb === "replaceChildren") {
    old_children = [...target.childNodes] as Node_Array;
  }
  const was_replaced = verb == "replaceWith";
  const disconnectors: Disconnector[] = [];
  const disconnect_all_observers = () => disconnectors.forEach(disconnector => disconnector());
  const check_if_revert_whole = () => {
    if (failed_surfaces !== surfaces.length) {
      return; // we didn't fail
    }
    dlog(`All surfaces`, surfaces, `failed. ${was_replaced ? "Reverting to old els" : "removing els"}`);
    failed_contexts.add(context);
    disconnect_all_observers();
    const flat_tnodes = template_nodes.flat();
    if (was_replaced) {
      flat_tnodes[0].replaceWith(target);
      for (let i = 1; i < flat_tnodes.length; i++) {
        flat_tnodes[i].remove();
      }
    } else if (old_children) {
      target.replaceChildren(...old_children);
    } else {
      flat_tnodes.forEach(n => n.remove());
    }
  };
  const template_nodes = surfaces.map(({ surface_, resolve_promise_ }) => {
    const [template_els, _get, set] = reactive_template();
    (async () => {
      let surface: void | Surface<T>;
      try {
        surface = await surface_;
      } catch (e) {
        report(
          [e, "A surface promise rejected" + (process.env.DEBUG === "true" ? " please catch this earlier" : "")],
          "warning"
        );
      }
      if (!try_forever && location.href !== starting_href) {
        // navigated away
        return;
      }
      // @ts-ignore
      if (surface?.elements) {
        dlog("insert_surface:", target, "." + verb, surface);
        set(surface.elements);

        if (surface.should_stay_inserted instanceof Promise) {
          surface.should_stay_inserted.then(
            catchify(keep => {
              if (keep) {
                // @ts-ignore
                resolve_promise_({ surface, succeeded: true });
              } else {
                dlog("Removing surface", surface, "because it failed");
                set("");
                // @ts-ignore
                resolve_promise_({ surface, succeeded: false });
                failed_surfaces++;
                check_if_revert_whole();
              }
            })
          );
        } else {
          resolve_promise_({ surface, succeeded: true });
        }
      } else {
        // @ts-ignore
        resolve_promise_({ surface, succeeded: false });
        failed_surfaces++;
        check_if_revert_whole();
      }
    })().catch(e => report([e, "insert_surface failed due to technical errors"], "error"));
    return template_els;
  });

  target[verb](...template_nodes.flat());
  if (preserve_elements) {
    for (let i = 0; i < template_nodes.length; i++) {
      const node_array = template_nodes[i];
      const already_observing_nodes = new WeakSet<CallbackableNode>();
      deal_w_removal_of_node_array(node_array, disconnectors.push.bind(disconnectors), already_observing_nodes);
    }
  }

  if (remove_after_navigation) {
    on_next_navigation(() => {
      disconnect_all_observers();
      template_nodes.flat().forEach(tn => tn.remove());
      dlog("Removed", template_nodes, "due to navigation");
    });
  }
  return disconnect_all_observers;
}

function deal_w_removal_of_node_array(
  node_array: Node_Array,
  push_disconnector: (disconnctor: Disconnector) => number,
  already_observing_nodes: WeakSet<CallbackableNode>
) {
  let removals_in_last_s = 0;
  for (let j = 0; j < node_array.length; j++) {
    const previous_parent = node_array[j].parentNode;
    const node_to_observe = node_array[j];
    // this function is "recursive"
    // it is possible that the reactive_template switches back to a Node_Array that it has already previously contained or to a new one that contains the same elements
    // there we don't want to re-add an observer
    if (already_observing_nodes.has(node_to_observe)) {
      continue;
    } else already_observing_nodes.add(node_to_observe);

    const disconnect_observer = observer.onremoved<CallbackableNode>(node_to_observe, eoe => {
      const mutation_record = eoe.mutation_record!; // .onremoved always has a mutation_record
      const { element } = eoe;
      const { nextSibling, previousSibling, target } = mutation_record;
      if (previous_parent !== target) {
        dlog(element, "was removed", eoe, "but because a parent got removed we're keeping it that way");
        return;
      }
      if (node_array.every(node => target.contains(node))) {
        // we know that this change was done by updating the reactive_template or a connected/synchronized reactive_template
        // node_array is a reference to an updating array
        // it has always updated once this callback is ran, so we can just check if the new value are currently in the DOM
        // here we don't check the order but I don't think it's going to be an issue?
        dlog("Ignoring removal of", element, eoe, "because it seems to come from reactive_template change");
        // protect future nodes
        deal_w_removal_of_node_array(node_array, push_disconnector, already_observing_nodes);
      } else if (!target.contains(element)) {
        // it's possible that the element already was re-inserted at the same time (this callback is executed a tick late), we obv. don't want to attempt to reinsert then
        if (removals_in_last_s > 10) {
          dlog("More than 10 reinsertions in last second, ignoring");
          return;
        }
        removals_in_last_s++;
        setTimeout(() => removals_in_last_s--, 1000);
        dlog(element, "was removed from DOM,", eoe, "reinserting");
        const { documentElement } = document;
        // try to get right place, didn't test this
        if (nextSibling && documentElement.contains(nextSibling)) {
          (nextSibling as CallbackableNode).before(element);
        } else if (previousSibling && documentElement.contains(previousSibling)) {
          (previousSibling as CallbackableNode).after(element);
        } else {
          // let's hope nobody made the target a textnode or this throws (unlikely since the typing of insert_surface doesn't allow it)
          (target as Element).append(element);
        }
      }
    });
    push_disconnector(disconnect_observer);
  }
}
