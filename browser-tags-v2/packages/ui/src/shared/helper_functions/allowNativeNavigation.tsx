/**
 * This function is used to determine if the user is trying to open a link in a new tab or window, and we therefore should not single page navigate
 * @param clickEvent The click event that triggered the navigation
 */
export function allowNativeNavigation(clickEvent?: MouseEvent) {
  return (
    clickEvent?.button || // if not zero it's a wheel click which opens in new tab
    clickEvent?.metaKey || // if true, cmd button on macOS which opens in new tab
    clickEvent?.ctrlKey || // if true, ctrl button on windows or linux which opens in new tab
    clickEvent?.shiftKey // if true, shift button on windows, linux or macOS which opens in a new window
  );
}
