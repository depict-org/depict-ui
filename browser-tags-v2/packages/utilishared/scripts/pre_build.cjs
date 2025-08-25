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

(async () => {
  const package_file_name = __dirname + "/../package.json";
  const package_file = JSON.parse(await readFile(package_file_name, "utf-8"));
  delete package_file["main"]; // having these left in there would make parcel build outputs we don't want
  delete package_file["module"];
  package_file["types"] = "dist/index.d.ts";
  await writeFile(package_file_name, JSON.stringify(package_file, null, 2), {
    encoding: "utf-8",
  });
})();
