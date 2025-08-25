const { readFile, writeFile } = require("fs").promises;

// Works around basically this https://github.com/parcel-bundler/parcel/issues/8434

(async () => {
  const filename = __dirname + "/../dist/index.d.ts";
  const contents = await readFile(filename, "utf-8");
  const lines = contents.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("import") && line.includes("from") && line.includes("api_schema")) {
      // fix API schema imports
      const [, after_from] = line.split("from");
      const [, string_content] = line.split('"');
      const [before_api_schema] = string_content.split("api_schema");
      lines[i] = line.replace(before_api_schema, "../../../lib/");
    } else if (line.includes('import("') && line.includes('").')) {
      // remove weird imports of types that are in the same file already
      lines[i] = line.replace(/import\(".*"\)./g, "");
    }
  }
  await writeFile(filename, lines.join("\n"), { encoding: "utf-8" });
})();

(async () => {
  const package_file_name = __dirname + "/../package.json";
  const package_file = JSON.parse(await readFile(package_file_name, "utf-8"));
  package_file.main = "ES10/index.cjs";
  package_file.module = "ES10/index.js";
  package_file.types = "ES10/index.d.ts";
  await writeFile(package_file_name, JSON.stringify(package_file, null, 2) + "\n", {
    encoding: "utf-8",
  });
})();
