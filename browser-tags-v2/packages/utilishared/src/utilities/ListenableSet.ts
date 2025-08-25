export interface ListenableSetEvent<T> extends CustomEvent {
  detail: T;
}

/**
 * Set but you can listen for values being added or removed
 * i.e. my_set.addEventListener("add", ({detail}) => console.log(detail, "was added to", my_set));
 */
export class ListenableSet<T> extends Set<T> {
  #et = new EventTarget();

  addEventListener(
    event: "add" | "delete",
    callback: (ev: ListenableSetEvent<T>) => unknown,
    options?: Parameters<(typeof EventTarget.prototype)["addEventListener"]>[2]
  ) {
    this.#et.addEventListener(event, callback as (evt: Event) => unknown, options);
  }

  removeEventListener(event: "add" | "delete", callback: (ev: Event) => unknown) {
    this.#et.removeEventListener(event, callback);
  }

  add(property: T) {
    Set.prototype.add.call(this, property);
    this.#et.dispatchEvent(new CustomEvent("add", { detail: property }));
    return this;
  }

  delete(property: T) {
    const return_value = Set.prototype.delete.call(this, property);
    this.#et.dispatchEvent(new CustomEvent("delete", { detail: property }));
    return return_value;
  }
}
