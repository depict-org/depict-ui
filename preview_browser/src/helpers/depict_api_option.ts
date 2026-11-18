import * as depict_ui from "@depict-ai/ui/latest";
import { dwarn } from "@depict-ai/utilishared/latest";
import { depict_api_param_name, depict_api_version } from "~/helpers/query_params";

/**
 * The SDK's `api` option for this page load: `{ api: "v4" }` with `?depict_api=v4`, else nothing (the SDK's v3
 * default). The SDK picks its API when it's constructed, so changing the parameter takes a reload.
 *
 * An SDK older than the native API takes `api` as a DepictAPI instance and breaks on a string, so the option is only
 * passed when the SDK has NativeDepictAPI.
 */
export function depict_api_option(): {} {
  if (typeof location === "undefined") return {};
  if (depict_api_version(new URLSearchParams(location.search).get(depict_api_param_name)) !== "v4") return {};
  if (!("NativeDepictAPI" in depict_ui)) {
    dwarn(`?${depict_api_param_name}=v4 ignored: this @depict-ai/ui has no native V4 API, so it reads v3`);
    return {};
  }
  return { api: "v4" };
}

/** Whether this page load reads the native V4 API (for the header's notice). */
export const reads_native_api = () => "api" in depict_api_option();
