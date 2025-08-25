import { createResource } from "solid-js";
import { get_merchant } from "~/helpers/url_state";
import { dwarn } from "@depict-ai/utilishared/latest";

export function get_available_markets_or_locales(getWhat: "markets" | "locales") {
  const [available] = createResource(get_merchant, async merchant => {
    if (!merchant || merchant === "null") return undefined;
    const url = new URL("https://api.depict.ai/v3/" + getWhat);
    url.searchParams.set("merchant", merchant);
    const response = await fetch(url.href);
    if (!response.ok) {
      dwarn("Can't get", getWhat, response);
      dwarn(await response.json());

      if (response.status === 500 && getWhat === "locales") {
        alert("Can't get locales - probably legacy merchant, redirecting to old preview browser");
        location.assign(`https://demo.custom.depict.ai/${merchant}`);
      }

      return undefined;
    }
    const decoded = await response.json();
    return decoded[getWhat] as string[];
  });
  return available;
}
