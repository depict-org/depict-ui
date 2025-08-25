import { dlog } from "../logging/dlog";

/**
 * Adds things to the object we send to backend in the query params to report the package versions used
 */
export const version_info: { [key: string]: string } = {};
export function add_to_version_info(package_name: string, version: string) {
  dlog("@depict-ai/" + package_name + " version", version);
  version_info[package_name] = version;
}

/**
 * Adds the version info to the query params of a URL
 * @param url: a URL object or a string containing a relative or absolute URL
 * @returns the same type as the input but with added query params
 */
export function add_version_query_params<T extends string | URL>(url: T) {
  const got_url_object = url instanceof URL;
  const url_object = got_url_object ? url : new URL(url, location.origin);
  for (const [key, value] of Object.entries(version_info)) {
    url_object.searchParams.set(key, value);
  }
  return (got_url_object ? url_object.href : url_object) as T;
}
