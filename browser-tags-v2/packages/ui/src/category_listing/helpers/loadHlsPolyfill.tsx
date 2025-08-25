import { is_available_in } from "@depict-ai/utilishared";

let cachedHlsModule: any;

export async function loadHlsPolyfill() {
  if (cachedHlsModule) return cachedHlsModule;
  const global_var_name = "_depict_ai_hls_polyfill";
  const scriptTag = document.createElement("script");
  scriptTag.type = "module";
  // Our build systems aren't set-up for dynamic imports, so do this instead
  scriptTag.append(`import("https://cdn.jsdelivr.net/npm/hls.js/+esm").then(m=>window.${global_var_name}=m)`);
  document.head.append(scriptTag);
  const hlsModule = await is_available_in(window, global_var_name);
  delete window[global_var_name];
  scriptTag.remove();
  cachedHlsModule = hlsModule;
  return hlsModule;
}
