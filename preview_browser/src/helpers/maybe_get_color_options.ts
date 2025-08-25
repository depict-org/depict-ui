import { Display } from "@depict-ai/utilishared/latest";

/*
  Very stupid attempt to get color options from a display object.
  We just hope the merchant config has reasonable attribute names and go from there.
 */
export const maybe_get_color_options = (raw_display: Display) => {
  const color_options =
    raw_display && "variant_index" in raw_display
      ? (raw_display?.variant_displays ?? []).reduce((acc, v) => {
          const key = v.color ?? v.color_name;
          if (key && !acc[key]) {
            acc[key] = key;
          }
          return acc;
        }, {})
      : {};
  return raw_display && "variant_index" in raw_display && Object.keys(color_options).length > 1
    ? (raw_display?.variant_displays ?? []).reduce((acc, v) => {
        const key = v.color ?? v.color_name;
        const hex_key = Object.keys(v).find(k => k.includes("hex") && !k.includes("badge"));
        if (!acc[key] && hex_key) {
          acc[key] = v[hex_key];
        }
        return acc;
      }, {})
    : {};
};
