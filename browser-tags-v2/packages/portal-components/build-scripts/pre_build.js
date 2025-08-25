const { readFile, writeFile } = require("fs").promises;

(async () => {
  const package_file_name = __dirname + "/../package.json";
  const version_filename = __dirname + "/../src/version.ts";
  const { version } = JSON.parse(await readFile(package_file_name, "utf-8"));
  await writeFile(
    version_filename,
    `export const version = "${version}";
`,
    { encoding: "utf-8" }
  );
})();

// Work around https://github.com/parcel-bundler/parcel/issues/7163
(async () => {
  const package_file_name = __dirname + "/../package.json";
  const package_file = JSON.parse(await readFile(package_file_name, "utf-8"));
  const new_package_file = {};

  // Maintain order and value of "sass" key, but hide it from Parcel
  for (const old_key of Object.keys(package_file)) {
    const new_key = old_key === "sass" ? "//sass" : old_key;
    new_package_file[new_key] = package_file[old_key];
  }

  await writeFile(package_file_name, JSON.stringify(new_package_file, null, 2), {
    encoding: "utf-8",
  });
})();
