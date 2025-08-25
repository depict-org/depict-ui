const { readFile, writeFile } = require("fs").promises;

// Forward PLP styling without building it
(async () => {
  const file_name = __dirname + "/../dist/styles/index.scss";
  await writeFile(
    file_name,
    `@forward "@depict-ai/plp-styling";
`,
    { encoding: "utf-8" }
  );
})();

// Work around https://github.com/parcel-bundler/parcel/issues/7163
(async () => {
  const package_file_name = __dirname + "/../package.json";
  const package_file = JSON.parse(await readFile(package_file_name, "utf-8"));
  const new_package_file = {};

  // Unhide "sass" key from Parcel, with same order and value as before
  for (const old_key of Object.keys(package_file)) {
    const new_key = old_key === "//sass" ? "sass" : old_key;
    new_package_file[new_key] = package_file[old_key];
  }

  new_package_file.main = "ES10/index.js";
  new_package_file.module = "ES10/index.cjs";
  new_package_file.types = "ES10/index.d.ts";

  await writeFile(package_file_name, JSON.stringify(new_package_file, null, 2) + "\n", {
    encoding: "utf-8",
  });
})();
