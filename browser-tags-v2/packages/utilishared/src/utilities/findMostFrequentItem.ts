/**
 * Finds most frequent item in an array, written by chatGPT with some nudging. Returns `undefined` if the array is empty.
 * @param arr array to find the most frequent item in
 */
export function findMostFrequentItem<T>(arr: T[]) {
  const freqMap = arr.reduce((map, item) => map.set(item, (map.get(item) || 0) + 1), new Map());
  const maxFreq = Math.max(...freqMap.values());
  for (let [key, value] of freqMap) {
    if (value === maxFreq) return key as T;
  }
}
