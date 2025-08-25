/**
 * Gives a random number between min and max (potentially including min and max).
 * @param min The minimum number.
 * @param max The maximum number.
 * @returns a random number
 */

export function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
