import { dlog } from "../logging/dlog";

/**
 * Makes Node.prototype.removeChild not throw and emulate correct removal when a node is being removed by React's VDOM diffing that we have already removed before
 * @return a WeakSet to add nodes to which you remove and want to ignore removal errors for
 */
export function removeChild_error_swallowing_factory() {
  const element_weak_set = new WeakSet<Node>();
  Node.prototype.removeChild = new Proxy(Node.prototype.removeChild, {
    apply(target, this_arg, arguments_list) {
      const el = arguments_list[0];
      if (el instanceof Node && element_weak_set.has(el)) {
        try {
          return target.apply(this_arg, arguments_list);
        } catch (e) {
          dlog("Swallowing error of removal of node that we have removed or created", e, el);
        }
        return el;
      }
      return target.apply(this_arg, arguments_list);
    },
  });
  return element_weak_set;
}
