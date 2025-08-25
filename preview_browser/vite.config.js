import { defineConfig } from "@solidjs/start/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  start: { ssr: false },
  build: { target: "esnext" },
  define: {
    // https://stackoverflow.com/a/75173793
    "process.env": `({"BUILD_TARGET":"modern","NODE_ENV":${JSON.stringify(process.env.NODE_ENV)},"DEBUG":"true"})`,
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
