import { dwarn } from "../logging/dlog";
import { catchify } from "../logging/error";
import { Display } from "../rendering/recommendation-renderer/types";

export const check_displays = /*@__PURE__*/ catchify(
  async ({
    recs,
    min_recs,
    market,
    type,
    product_id,
    tenant,
  }: {
    recs: Display[] | { displays: Display[] } | Promise<Display[] | { displays: Display[] }>;
    min_recs?: number;
    market: string;
    type: string;
    product_id:
      | string
      | string[]
      | Promise<string>
      | Promise<string[]>
      | ((arg0?: string) => string | string[] | Promise<string> | Promise<string[]>)
      | undefined;
    tenant: string;
  }) => {
    if (type == "placeholder") {
      return;
    }
    if (typeof product_id === "function") {
      product_id = product_id();
    }
    product_id = await product_id;
    recs = await recs;
    if (typeof recs === "object") {
      if (!Array.isArray(recs)) {
        recs = recs?.displays;
      }
      if (Array.isArray(recs)) {
        if (min_recs == undefined) {
          min_recs = 10;
        }
        if (recs.length < min_recs) {
          dwarn(
            "Displays provided to check_displays is too short, it contains",
            recs.length,
            "displays which is less than",
            min_recs
          );
          return false;
        } else {
          return true;
        }
      } else {
        dwarn(new Error("neither recs nor recs.displays are an array"));
      }
    } else {
      dwarn(new Error("Non object was passed to check_displays"));
    }
  }
);
