import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const packageFile = new URL("../../package.json", import.meta.url);
const original = await readFile(packageFile, "utf8");
try {
  const config = JSON.parse(original);
  // Source files use both import paths. Use one compiled version in this fixture.
  config.alias["@depict-ai/utilishared/latest"] = "./packages/utilishared/ES10/index.js";
  await writeFile(packageFile, JSON.stringify(config));
  const build = spawnSync(
    "yarn",
    [
      "parcel",
      "build",
      "testcafe/content-cards/index.html",
      "--dist-dir",
      ".content-card-visual",
      "--target",
      "modern",
      "--no-source-maps",
    ],
    { cwd: root, stdio: "inherit" }
  );
  if (build.error) throw build.error;
  process.exitCode = build.status ?? 1;
} finally {
  await writeFile(packageFile, original);
}
