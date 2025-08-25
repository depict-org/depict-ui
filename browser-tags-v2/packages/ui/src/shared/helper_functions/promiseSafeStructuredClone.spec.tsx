import { describe, expect, test } from "@jest/globals";
import { promiseSafeStructuredClone } from "./promiseSafeStructuredClone";

// Tests written by chatGPT

describe("promiseSafeStructuredClone", () => {
  test("should clone a simple object", () => {
    const obj = { a: 1, b: "test" };
    const clonedObj = promiseSafeStructuredClone(obj);
    expect(clonedObj).toEqual(obj);
    expect(clonedObj).not.toBe(obj);
  });

  test("should reapply promise to cloned object", async () => {
    const promise = Promise.resolve("promise value");
    const obj = { a: 1, b: promise };
    const clonedObj = promiseSafeStructuredClone(obj);
    expect(await clonedObj.b).toEqual("promise value");
    expect(clonedObj).not.toBe(obj);
  });

  test("should clone nested objects correctly", () => {
    const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
    const clonedObj = promiseSafeStructuredClone(obj);
    expect(clonedObj).toEqual(obj);
    expect(clonedObj.b).not.toBe(obj.b);
    expect(clonedObj.b.d).not.toBe(obj.b.d);
  });

  test("should clone arrays correctly", async () => {
    const promise = Promise.resolve("promise value");
    const obj = [1, promise, 3];
    const clonedObj = promiseSafeStructuredClone(obj);
    expect(await clonedObj[1]).toEqual("promise value");
    expect(clonedObj).not.toBe(obj);
  });

  test("should handle circular references", () => {
    const obj = { a: 1 } as any;
    obj.b = obj;
    const clonedObj = promiseSafeStructuredClone(obj);
    expect(clonedObj.b).toBe(clonedObj);
  });

  test("should return the same promise if input is a promise", () => {
    const promise = Promise.resolve("promise value");
    const clonedPromise = promiseSafeStructuredClone(promise);
    expect(clonedPromise).toBe(promise);
  });
});

describe("promiseSafeStructuredClone - Advanced Tests", () => {
  test("should clone a complex object with deeply nested promises", async () => {
    const deepPromise = Promise.resolve("deep promise value");
    const complexObj = {
      a: 1,
      b: [Promise.resolve("array promise"), { c: deepPromise, d: [3, deepPromise] }],
      e: { f: { g: deepPromise } },
    } as const;
    const clonedObj = promiseSafeStructuredClone(complexObj);
    expect(await clonedObj.b[0]).toEqual("array promise");
    expect(await clonedObj.b[1].c).toEqual("deep promise value");
    expect(await clonedObj.b[1].d[1]).toEqual("deep promise value");
    expect(await clonedObj.e.f.g).toEqual("deep promise value");
    expect(clonedObj).not.toBe(complexObj);
  });

  test("original object should remain unaltered after cloning", async () => {
    const promise1 = Promise.resolve("promise 1");
    const promise2 = Promise.resolve("promise 2");
    const originalObj = { a: promise1, b: { c: promise2 } };
    const clonedObj = promiseSafeStructuredClone(originalObj);

    // Check the original object
    expect(await originalObj.a).toEqual("promise 1");
    expect(await originalObj.b.c).toEqual("promise 2");

    // Check the cloned object
    expect(await clonedObj.a).toEqual("promise 1");
    expect(await clonedObj.b.c).toEqual("promise 2");

    // Ensure promises are in the same position
    expect(originalObj.a).toBe(promise1);
    expect(originalObj.b.c).toBe(promise2);
  });

  test("should handle objects with functions", () => {
    const fn = () => {};
    const objWithFunction = { a: 1, b: fn };
    expect(() => promiseSafeStructuredClone(objWithFunction)).toThrow();
  });
});

describe("promiseSafeStructuredClone - Unaltered Object Tests", () => {
  test("original object should remain unaltered when cloning complex object with deeply nested promises", async () => {
    const deepPromise = Promise.resolve("deep promise value");
    const originalComplexObj = {
      a: 1,
      b: [Promise.resolve("array promise"), { c: deepPromise, d: [3, deepPromise] }],
      e: { f: { g: deepPromise } },
    } as const;

    const clonedObj = promiseSafeStructuredClone(originalComplexObj);

    // Check the original complex object remains unaltered
    expect(await originalComplexObj.b[0]).toEqual("array promise");
    expect(await originalComplexObj.b[1].c).toEqual("deep promise value");
    expect(await originalComplexObj.b[1].d[1]).toEqual("deep promise value");
    expect(await originalComplexObj.e.f.g).toEqual("deep promise value");
  });

  test("original object should remain unaltered when function causes throw", () => {
    const fn = () => {};
    const originalObjWithFunction = { a: 1, b: fn };

    try {
      promiseSafeStructuredClone(originalObjWithFunction);
    } catch (e) {
      // Expected to throw, but original object should be unaltered
      expect(originalObjWithFunction).toEqual({ a: 1, b: fn });
    }
  });
});

describe("promiseSafeStructuredClone - Integrity of Promises in Original Object", () => {
  test("promises in original complex object remain unaltered after cloning", async () => {
    const deepPromise = Promise.resolve("deep promise value");
    const originalComplexObj = {
      a: 1,
      b: [Promise.resolve("array promise"), { c: deepPromise, d: [3, deepPromise] }],
      e: { f: { g: deepPromise } },
    } as const;

    const clonedObj = promiseSafeStructuredClone(originalComplexObj);

    // Check the promises in the original complex object remain unaltered
    expect(originalComplexObj.b[0]).toBeInstanceOf(Promise);
    expect(originalComplexObj.b[1].c).toBe(deepPromise);
    expect(originalComplexObj.b[1].d[1]).toBe(deepPromise);
    expect(originalComplexObj.e.f.g).toBe(deepPromise);

    expect(clonedObj.b[0]).toBeInstanceOf(Promise);
    expect(clonedObj.b[1].c).toBe(deepPromise);
    expect(clonedObj.b[1].d[1]).toBe(deepPromise);
    expect(clonedObj.e.f.g).toBe(deepPromise);
  });

  test("promises in original object with function remain unaltered when function causes throw", async () => {
    const promise1 = Promise.resolve("promise 1");
    const promise2 = Promise.resolve("promise 2");
    const fn = () => {};
    const originalObjWithFunctionAndPromises = { a: promise1, b: { c: fn, d: promise2 } };

    try {
      promiseSafeStructuredClone(originalObjWithFunctionAndPromises);
    } catch (e) {
      // Expected to throw, but promises in the original object should be unaltered
      expect(originalObjWithFunctionAndPromises.a).toBe(promise1);
      expect(originalObjWithFunctionAndPromises.b.d).toBe(promise2);
    }
  });
});

describe("promiseSafeStructuredClone - Handling Random Inputs", () => {
  test("should handle primitive types", () => {
    const number = 42;
    const string = "hello";
    const boolean = true;

    expect(promiseSafeStructuredClone(number)).toEqual(number);
    expect(promiseSafeStructuredClone(string)).toEqual(string);
    expect(promiseSafeStructuredClone(boolean)).toEqual(boolean);
  });

  test("should handle null and undefined", () => {
    expect(promiseSafeStructuredClone(null)).toBeNull();
    expect(promiseSafeStructuredClone(undefined)).toBeUndefined();
  });

  test("should handle a function", () => {
    const fn = () => {};
    expect(() => promiseSafeStructuredClone(fn)).toThrow();
  });

  test("should handle an instance of a class", () => {
    class MyClass {
      a: number;
      constructor() {
        this.a = 1;
      }
    }
    const myClassInstance = new MyClass();
    expect(promiseSafeStructuredClone(myClassInstance)).toEqual(myClassInstance);
  });

  test("should handle a Date object", () => {
    const date = new Date();
    const clonedDate = promiseSafeStructuredClone(date);
    expect(clonedDate).toEqual(date);
    expect(clonedDate).not.toBe(date); // Dates should be cloned, not the same reference
  });

  test("should handle a RegExp object", () => {
    const regex = /abc/;
    const clonedRegex = promiseSafeStructuredClone(regex);
    expect(clonedRegex).toEqual(regex);
    expect(clonedRegex).not.toBe(regex); // RegExp should be cloned, not the same reference
  });
});
