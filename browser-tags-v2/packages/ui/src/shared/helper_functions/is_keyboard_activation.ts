/**
 * Whether a click came from the keyboard (Enter/Space) rather than a pointer. Browsers report `detail === 0` for
 * keyboard-activated clicks and `>= 1` for real pointer clicks, so we use it to only move focus on keyboard opens.
 */
export function is_keyboard_activation(event: MouseEvent) {
  return event.detail === 0;
}
