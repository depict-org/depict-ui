/**
 * This is a function that will safely clone an object that may contain promises.
 * It will use structuredClone to clone the object and then re-apply (copy) any promises that were in the original object to the cloned object.
 * @param obj Anything to clone
 */
export function promiseSafeStructuredClone<T>(obj: T): T {
  if (obj instanceof Promise) return obj;
  // Extract all promises, keep a map of them, and then re-apply them to both the original object and the target object after cloning
  type KeyPath = (symbol | string | number)[];
  const seen = new Set();
  const keyStack: KeyPath[] = [[]];
  const valueStack: any[] = [obj];
  const promiseLocationStack: [KeyPath, Promise<any>][] = [];

  while (valueStack.length) {
    const value = valueStack.pop()!;
    const keyPath = keyStack.pop()!;

    // Promises can only be in objects and we don't need to check for objects we've already seen (like in circular references)
    if (typeof value !== "object" || value === null || seen.has(value)) continue;
    seen.add(value);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const ourValue = value[i];
        const valuesKeyPath = [...keyPath, i];
        if (ourValue instanceof Promise) {
          promiseLocationStack.push([valuesKeyPath, ourValue]);
          delete value[i]; // This will leave a hole in the array, but it's fine since we'll put it back soon
          // This way both the indexes will be correct when putting the value back and our for loop doesn't get messed up
        } else {
          keyStack.push(valuesKeyPath);
          valueStack.push(ourValue);
        }
      }
      continue;
    }
    for (const innerKey in value) {
      const ourValue = value[innerKey];
      const valuesKeyPath = [...keyPath, innerKey];
      if (ourValue instanceof Promise) {
        promiseLocationStack.push([valuesKeyPath, ourValue]);
        delete value[innerKey];
      } else {
        keyStack.push(valuesKeyPath);
        valueStack.push(ourValue);
      }
    }
  }

  let structuredClonedObject: T | undefined;
  let error: any;

  try {
    structuredClonedObject = structuredClone(obj);
  } catch (e) {
    // We still need to put back the promises in the original object, even if we threw an error
    error = e;
  }

  // Put back the promises in both the original object and the cloned object
  while (promiseLocationStack.length) {
    const [keyPath, promise] = promiseLocationStack.pop()!;
    let targetInClone = structuredClonedObject;
    let targetInOriginal = obj;
    for (let i = 0; i < keyPath.length - 1; i++) {
      if (!error) targetInClone = targetInClone![keyPath[i]];
      targetInOriginal = targetInOriginal[keyPath[i]];
    }
    if (!error) targetInClone![keyPath[keyPath.length - 1]] = promise;
    targetInOriginal[keyPath[keyPath.length - 1]] = promise;
  }

  if (error) throw error;
  return structuredClonedObject!;
}
