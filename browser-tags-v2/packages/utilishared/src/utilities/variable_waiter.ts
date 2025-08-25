import { async_iterable_ipns } from "./infinite_promise/async_iterable_ipns";
import { err } from "../deprecated/err";
import { dlog } from "../logging/dlog";

/**
 * is_available_in: this function returns a promise that resolves once a variable has been defined inside of an object - or instantly, if it's already defined.
 * The function uses getters and setters instead of polling which means it doesn't waste any resources.
 * If there are already getters or setters the function will proxy them, retaining their original functionality.
 * Only drawback is you can only wait for the variable being defined once, not for every change.
 * @param  obj                                      The base object to look in
 * @param  property                                 The property to wait for first
 * @param  ...sub_objects_to_wait_for               A list of further properties to wait for in the result of the last awaited thing
 * @return                            A promise containing the value of the variable that has been defined
 */
export async function is_available_in(obj: Object, property: PropertyKey, ...sub_objects_to_wait_for: PropertyKey[]) {
  let value: any;
  if (typeof obj[property] === "undefined") {
    value = await wait_for_variable_in_object(property, obj).catch(err);
  } else {
    value = obj[property];
  }
  if (value && sub_objects_to_wait_for?.length) {
    return is_available_in(value, ...(sub_objects_to_wait_for as [PropertyKey, ...PropertyKey[]])).catch(err);
  } else {
    return value;
  }
}

async function wait_for_variable_in_object(variable: PropertyKey, obj: Object) {
  const start = new Date().getTime();
  dlog("waiting for definition of variable", variable, "in", obj);
  let var_behind_the_scenes: any;
  let resolve_variable_definition: (value: any) => void;
  let was_defined = false;
  const definition_of_var = new Promise(r => (resolve_variable_definition = r));

  const previous_descriptor = find_descriptor(obj, variable);
  const get = typeof previous_descriptor?.get == "function" ? previous_descriptor.get : () => var_behind_the_scenes;

  const set =
    typeof previous_descriptor?.set == "function"
      ? new Proxy(previous_descriptor.set, {
          apply(target, this_arg, arguments_list) {
            if (!was_defined) {
              was_defined = true;
              resolve_variable_definition(arguments_list[0]);
            }
            return target.apply(this_arg, arguments_list);
          },
        })
      : (value: any) => {
          if (!was_defined) {
            was_defined = true;
            resolve_variable_definition(value);
          }
          return (var_behind_the_scenes = value);
        };

  Object.defineProperty(obj, variable, {
    configurable: true,
    enumerable: true,
    get,
    set,
  });
  dlog("everything's set up, waiting for promise by setter to resolve");
  const result = await definition_of_var;
  dlog("Promise resolved, ", result, " is here. We waited", new Date().getTime() - start, "ms");
  return result;
}

export function find_descriptor(obj: Object, prop: PropertyKey): PropertyDescriptor | undefined {
  // https://stackoverflow.com/a/38802602/10659982
  if (obj != null) {
    return Object.hasOwnProperty.call(obj, prop)
      ? Object.getOwnPropertyDescriptor(obj, prop)
      : find_descriptor(Object.getPrototypeOf(obj), prop);
  }
}

export function variable_setter_to_ipns<T>(
  obj: Object,
  variable: PropertyKey,
  async_iterator_should_return_state_on_first_call?: boolean
) {
  const definition_ipns = async_iterable_ipns<T>(async_iterator_should_return_state_on_first_call);
  let var_behind_the_scenes: T = obj[variable];
  definition_ipns(var_behind_the_scenes); // resolve with initial value

  const previous_descriptor = find_descriptor(obj, variable);
  const get = typeof previous_descriptor?.get == "function" ? previous_descriptor.get : () => var_behind_the_scenes;

  const set =
    typeof previous_descriptor?.set == "function"
      ? new Proxy(previous_descriptor.set, {
          apply(target, this_arg, arguments_list) {
            definition_ipns(arguments_list[0]);
            return target.apply(this_arg, arguments_list);
          },
        })
      : (value: T) => {
          definition_ipns(value);
          var_behind_the_scenes = value;
        };

  Object.defineProperty(obj, variable, {
    configurable: true,
    enumerable: true,
    get,
    set,
  });
  return definition_ipns;
}
