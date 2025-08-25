/**
 * Class containing state that an IPNS operates on. It's only exported for type info and in case that you want to use it for instanceof checks.
 * subscribers is an array of functions that get called every time push_value is called with a new value AND all previous subscribers are done
 * queue is the queue of values that subscribers gets called with
 * last_processed_value is the last value that the subscribers were called with
 * push_value adds a new value to the queue and triggers the calling of the subscribers if they're done
 * subscriber_done decrements the number of subscribers we are waiting for, if this isn't called call_subscribers will get stuck. It also triggers a new call to call_subscribers
 */
export class RawObservableInformation<T> {
  subscribers_: ((val: T) => void)[] = [];
  waiting_for_update_ = 0;
  queue_: T[] = [];
  last_processed_value_: T | undefined;
  has_had_value_ = false;
  push_value_ = (value: T) => {
    this.queue_.push(value);
    this.call_subscribers_();
  };
  call_subscribers_ = () => {
    // intentionally arrow fn so it doesn't matter what .this is when being called
    if (this.waiting_for_update_ <= 0 && this.queue_.length) {
      // shift value
      const next_value = this.queue_.shift();
      this.last_processed_value_ = next_value;
      this.has_had_value_ ||= true;
      for (let i = 0; i < this.subscribers_.length; i++) {
        this.waiting_for_update_++;
        this.subscribers_[i](next_value!);
      }
    }
  };
  subscriber_done_ = () => {
    this.waiting_for_update_--;
    this.call_subscribers_();
  };
}

/**
 * Makes an asyncIterable function out of a RawObservableInformation instance
 */
export function make_simple_async_iterable<T>(state: RawObservableInformation<T>) {
  const asyncIterable = {
    [Symbol.asyncIterator]() {
      let resolve_value_promise: (arg0: { value: T; done: false }) => void;
      let value_promise: Promise<{
        value: T;
        done: false;
      }>;
      let subscribed_fn_is_processing = false;
      const update_promises = () => {
        value_promise = new Promise<{ value: T; done: false }>(r => (resolve_value_promise = r));
      };
      const current_subscribed_fn = (value: T) => {
        subscribed_fn_is_processing = true;
        resolve_value_promise({ value, done: false });
      };
      const set_processs_done = () => {
        if (subscribed_fn_is_processing) {
          subscribed_fn_is_processing = false;
          state.subscriber_done_();
        }
      };

      update_promises();
      state.subscribers_.push(current_subscribed_fn);

      return {
        next() {
          update_promises(); // do this first
          set_processs_done(); // will lead to new resolving of promises

          return value_promise;
        },
        return() {
          // This will be reached if the consumer called 'break' or 'return' early in the loop.
          const index = state.subscribers_.indexOf(current_subscribed_fn);
          if (index >= 0) {
            state.subscribers_.splice(index, 1);
          }
          set_processs_done(); // this will trigger subscribers to run again so we want to have removed ourselves first
          return Promise.resolve({ done: true } as unknown as { value: T; done: false }); // typescript goes nuts otherwise lol
        },
      };
    },
  };

  return Object.assign((...values: T[]) => {
    for (let i = 0; i < values.length; i++) {
      state.push_value_(values[i]);
    }
  }, asyncIterable);
}
