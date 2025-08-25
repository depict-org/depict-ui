// Source: https://stackoverflow.com/a/30106551

/**
 * Encoding UTF8 ⇢ base64
 */
export function base64_encode_unicode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

/**
 * Decoding base64 ⇢ UTF8
 */
export function base64_decode_unicode(str) {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
}
