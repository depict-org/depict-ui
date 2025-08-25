/**
 * Converts RGB to HSL
 * Source of function: https://www.30secondsofcode.org/js/s/rgb-to-hsl
 */
export function rgb_to_hsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s ? (l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s) : 0;
  return [
    60 * h < 0 ? 60 * h + 360 : 60 * h,
    100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
    (100 * (2 * l - s)) / 2,
  ] as const;
}

/**
 * Converts HSL to RGB
 * Source of function: https://www.30secondsofcode.org/js/s/hsl-to-rgb
 */
export function hsl_to_rgb(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)] as const;
}

/**
 * Converts HSV (or HSB, it's the same) to RGB.
 * Source of function: https://www.30secondsofcode.org/js/s/hsb-to-rgb/
 */
export function hsb_to_rgb(h: number, s: number, b: number) {
  s /= 100;
  b /= 100;
  const k = n => (n + h / 60) % 6;
  const f = n => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [255 * f(5), 255 * f(3), 255 * f(1)] as const;
}

/**
 * Calculates the relative luminance of a RGB color
 * Source: https://gist.github.com/jfsiii/5641126
 */
export function relative_luminance_from_rgb(R8bit: number, G8bit: number, B8bit: number) {
  // from from http://www.w3.org/TR/WCAG20/#relativeluminancedef
  const RsRGB = R8bit / 255;
  const GsRGB = G8bit / 255;
  const BsRGB = B8bit / 255;

  const R = RsRGB <= 0.03928 ? RsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);
  const G = GsRGB <= 0.03928 ? GsRGB / 12.92 : Math.pow((GsRGB + 0.055) / 1.055, 2.4);
  const B = BsRGB <= 0.03928 ? BsRGB / 12.92 : Math.pow((BsRGB + 0.055) / 1.055, 2.4);

  // For the sRGB colorspace, the relative luminance of a color is defined as:
  const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;

  return L;
}

/**
 * Converts a hex string to an RGB array
 * Source: https://stackoverflow.com/a/39077686
 */
export function hex_to_rgb(hex: string): [number, number, number] | null {
  const rgb = hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => "#" + r + r + g + g + b + b)
    ?.substring(1)
    ?.match(/.{2}/g)
    ?.map(x => parseInt(x, 16));
  if (!(rgb?.length === 3 && rgb.every(x => typeof x === "number" && x >= 0 && x <= 255))) {
    return null;
  }
  return rgb as [number, number, number];
}
