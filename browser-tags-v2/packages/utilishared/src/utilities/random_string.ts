/**
 * Returns a random string
 * @return A random string, containing a-z, 0-9 and occasionally a dot (`.`)
 */
export function random_string() {
  return (Math.random() * 2e17).toString(36);
}

export function make_random_classname() {
  return "x" + random_string().replaceAll(".", "");
}
