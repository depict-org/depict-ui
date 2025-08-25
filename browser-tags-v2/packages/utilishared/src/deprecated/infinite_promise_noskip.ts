import { deparallelize } from "../utilities/async_function_only_once";

/**
 * @deprecated use async_iterable_ipns instead. It has a nicer API and more of an ecosystem.
 */
export class infinite_promise_no_skip<T> {
  #values_to_resolve_with: T[] = [];
  #internal_resolve: (arg0?: any) => void;
  #previous_promise: Promise<any> = Promise.resolve();
  promise = new Promise<T>(r => (this.#internal_resolve = r));

  #work_queue_max_once = deparallelize(this.#work_queue.bind(this));

  resolve = (value: T) => {
    this.#values_to_resolve_with.push(value);
    this.#work_queue_max_once();
  };

  async #work_queue() {
    const vtrw = this.#values_to_resolve_with;
    for (let i = 0; i < vtrw.length; i++) {
      await this.#previous_promise;
      const oldresolve = this.#internal_resolve;
      this.#previous_promise = this.promise;
      this.promise = new Promise(r => (this.#internal_resolve = r));
      oldresolve(vtrw[i]);
    }
    while (vtrw.length) {
      vtrw.pop();
    }
  }
}
