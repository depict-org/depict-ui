import { test_array_proxy_support } from "../rendering/image_lazyloader";
import { catchify } from "../logging/error";
import { dlog } from "../logging/dlog";

/**
 * Listens to localstorage changes with `setItem` and direct assignment.
 * @param listener a function to invoke every time something in the localStorage changes. It gets two arguments: key and value, key being the key of the item set and value being the value of the item set.
 */
export function listenToLocalStorage(listener: (key: string, value: string) => void) {
  if (!test_array_proxy_support()) {
    dlog("Not hooking localStorage as it would freeze it due to lacking Proxy support");
    return;
  }

  const caught_listener = catchify(listener);
  let changed_instance: boolean;
  const update_changed_instance = () => (changed_instance = Storage.prototype.setItem !== localStorage.setItem);
  update_changed_instance();
  const orig_storage = localStorage;
  const proxied_set_items = new WeakMap<typeof Storage.prototype.setItem>();
  const changed_this_args = new WeakSet<Function>();
  const create_setItem_proxy = (setItem_fn: typeof Storage.prototype.setItem) => {
    if (proxied_set_items.has(setItem_fn)) {
      return proxied_set_items.get(setItem_fn);
    }
    const proxied_fn = new Proxy(setItem_fn, {
      apply(target, this_arg, arg_list: [string, string]) {
        // this function can also run on sessionStorage.setItem, hence this check
        if (this_arg === proxied_localStorage || this_arg === orig_storage) {
          caught_listener(...arg_list);
          return target.apply(orig_storage, arg_list);
        }
        return target.apply(this_arg, arg_list);
      },
    });
    proxied_set_items.set(setItem_fn, proxied_fn);
    return proxied_fn;
  };

  // stolen from src/nordicagolf/repairing_their_cart.ts, which was in turn
  // stolen from stackoverflow but let's give credit to this instead because I didn't find the post again: https://gist.github.com/mynameislau/b7eabfcdc0a17ac41cdc0b974f94d807
  // much adapted after that, probably no longer that similar

  const proxied_localStorage = new Proxy(orig_storage, {
    set(storage, key: string, value) {
      caught_listener(key, value);
      storage[key] = value;
      if (key === "setItem") {
        update_changed_instance();
      }
      return true;
    },
    get(storage, key: string) {
      const orig_value = storage[key];
      if (typeof orig_value === "function") {
        if (key === "setItem") {
          if (changed_instance) {
            return create_setItem_proxy(orig_value);
          } else {
            return orig_value; // will have been proxied with create_setItem_proxy in Storage.prototype further down
          }
        }
        if (!changed_this_args.has(orig_value)) {
          return new Proxy(orig_value, {
            // for some reason all functions like getItem throw when called with `this` being a proxied Storage Object
            apply(target, this_arg, arg_list) {
              return target.apply(this_arg === proxied_localStorage ? orig_storage : this_arg, arg_list);
            },
          });
        }
      }
      return orig_value;
    },
  });

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    value: proxied_localStorage,
  });

  const storage_prototype = Storage.prototype;
  storage_prototype.setItem = create_setItem_proxy(storage_prototype.setItem);

  for (const key in storage_prototype) {
    try {
      const value = storage_prototype[key];
      if (key !== "setItem" && typeof value === "function") {
        const fn_with_changed_this_arg = new Proxy(value, {
          apply(target, this_arg, arg_list) {
            return target.apply(this_arg === proxied_localStorage ? orig_storage : this_arg, arg_list);
          },
        });
        storage_prototype[key] = fn_with_changed_this_arg;
        changed_this_args.add(fn_with_changed_this_arg);
      }
    } catch (e) {
      if (key !== "length") {
        dlog(e);
      }
    }
  }
}
