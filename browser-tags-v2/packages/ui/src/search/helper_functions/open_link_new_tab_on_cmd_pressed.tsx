/** @jsxImportSource solid-js */
/**
 * Opens link in a new tab if cmd/ctrl is pressed and returns true in that case
 * Used for open-in-new-tab functionality on open-on-enter links
 */
export function open_link_new_tab_on_cmd_pressed(e: KeyboardEvent, href: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey) {
    // Open link in a new tab/window with cmd/ctrl + enter.
    const link = (<a href={href} target="_blank" />) as HTMLAnchorElement;
    document.body.append(link);
    link.click();
    link.remove();
    return true;
  }
  return false;
}
