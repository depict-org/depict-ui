import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { requestIdleCallbackWithGuaranteedTimeout } from "./requestIdleCallbackWithGuaranteedTimeout";

describe("requestIdleCallbackWithGuaranteedTimeout", () => {
  let deadlineToPass: IdleDeadline | null;

  beforeEach(() => {
    jest.useFakeTimers();
    // Stand-in for requestIdleCallback that calls back on the next tick with whatever deadline the test sets
    globalThis.requestIdleCallback = (cb: IdleRequestCallback) =>
      setTimeout(() => cb(deadlineToPass as IdleDeadline)) as unknown as number;
    globalThis.cancelIdleCallback = (handle: number) => clearTimeout(handle);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("gives callers a working deadline when a polyfill calls back with null (accessiBe on Safari)", () => {
    deadlineToPass = null;
    const callback = jest.fn<IdleRequestCallback>();
    requestIdleCallbackWithGuaranteedTimeout(callback, { timeout: 15000 });
    jest.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledTimes(1);
    const deadline = callback.mock.calls[0][0];
    expect(deadline.didTimeout).toBe(false);
    expect(deadline.timeRemaining()).toBeGreaterThan(0);
    expect(deadline.timeRemaining()).toBeLessThanOrEqual(50);

    // The racing timeout was cancelled, so the callback doesn't run a second time
    jest.advanceTimersByTime(20000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("passes a real deadline through unchanged", () => {
    deadlineToPass = { didTimeout: true, timeRemaining: () => 12 };
    const callback = jest.fn<IdleRequestCallback>();
    requestIdleCallbackWithGuaranteedTimeout(callback, { timeout: 15000 });
    jest.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledWith(deadlineToPass);
  });
});
