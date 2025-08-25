/**
 * Useful for the `thresholds` option of IntersectionObserver - if you want to be notified at a 10% change, call this and set num_steps to 10. Pls see https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/thresholds
 * @param  numSteps               How many steps (notifications) there should be between 0 and 100% intersection
 * @return          Stuff to give to IntersectionObserver
 */
export function buildThresholdList(numSteps: number) {
  const thresholds: number[] = [];

  for (let i = 1.0; i <= numSteps; i++) {
    const ratio = i / numSteps;
    thresholds.push(ratio);
  }

  thresholds.push(0);
  return thresholds;
}
