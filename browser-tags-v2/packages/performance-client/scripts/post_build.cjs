const { readFile, writeFile } = require("fs").promises;

(async () => {
  const package_file_name = __dirname + "/../package.json";
  const package_file = JSON.parse(await readFile(package_file_name, "utf-8"));
  package_file.main = "ES10/index.cjs";
  package_file.module = "ES10/index.js";
  package_file["types"] = "ES10/index.d.ts";
  await writeFile(package_file_name, JSON.stringify(package_file, null, 2) + "\n", {
    encoding: "utf-8",
  });
})();
